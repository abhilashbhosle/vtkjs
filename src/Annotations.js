import { useState, useRef, useEffect } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkSTLReader from '@kitware/vtk.js/IO/Geometry/STLReader';
import vtkPicker from '@kitware/vtk.js/Rendering/Core/Picker';

function Annotations() {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);
  const [representation, setRepresentation] = useState(2);
  const [stlFiles, setStlFiles] = useState([]);
  const [clickedFileName, setClickedFileName] = useState(null);
  const [colorScheme, setColorScheme] = useState({}); // Color scheme state

  // Maintain a mapping of actors to file names
  const actorFileMap = useRef(new Map());

  useEffect(() => {
    if (!context.current) {
      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkContainerRef.current,
      });

      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow();
      const interactor = fullScreenRenderer.getInteractor();
      const picker = vtkPicker.newInstance();

      context.current = {
        fullScreenRenderer,
        renderWindow,
        renderer,
        interactor,
        actors: [],
        picker,
      };

      // Setup picking interaction
      interactor.onLeftButtonPress((callData) => {
        const { picker, renderer } = context.current;

        if (!renderer || !callData.pokedRenderer) return;

        const position = callData.position;
        picker.pick([position.x, position.y, 0], renderer);

        const pickedActor = picker.getActors()[0];
        if (pickedActor && actorFileMap.current.has(pickedActor)) {
          setClickedFileName(actorFileMap.current.get(pickedActor));
        } else {
          setClickedFileName(null);
        }
      });

      renderWindow.render();
    }

    return () => {
      if (context.current) {
        const { fullScreenRenderer, actors } = context.current;

        actors.forEach((actor) => actor.delete());
        fullScreenRenderer.delete();
        context.current = null;
      }
    };
  }, [vtkContainerRef]);

  useEffect(() => {
    if (context.current && stlFiles.length > 0) {
      const { renderer, renderWindow, actors } = context.current;

      // Clear previous actors
      actors.forEach((actor) => {
        renderer.removeActor(actor);
        actor.delete();
      });
      actors.length = 0;
      actorFileMap.current.clear();

      // Process each STL file
      stlFiles.forEach((file, index) => {
        const readerFile = new FileReader();
        const reader = vtkSTLReader.newInstance();
        const mapper = vtkMapper.newInstance();
        const actor = vtkActor.newInstance();

        readerFile.onload = (e) => {
          reader.parseAsArrayBuffer(e.target.result);
          mapper.setInputConnection(reader.getOutputPort());
          actor.setMapper(mapper);
          actor.getProperty().setRepresentation(representation);

          // Assign a color based on the color scheme or default
          const color = colorScheme[file.name] || [1, 1, 1]; // Default to white
          actor.getProperty().setColor(...color);

          renderer.addActor(actor);
          actors.push(actor);
          actorFileMap.current.set(actor, file.name);
          renderer.resetCamera();
          renderWindow.render();
        };

        readerFile.readAsArrayBuffer(file);
      });
    }
  }, [stlFiles, representation, colorScheme]);

  const handleFileInput = (event) => {
    const files = Array.from(event.target.files);
    setStlFiles(files);

    // Update the color scheme with default colors
    const newColorScheme = {};
    files.forEach((file, index) => {
      // Assign random colors or predefined ones
      newColorScheme[file.name] = [Math.random(), Math.random(), Math.random()];
    });
    setColorScheme(newColorScheme);
  };

  const handleColorChange = (fileName, color) => {
    setColorScheme((prev) => ({
      ...prev,
      [fileName]: color.map((c) => c / 255), // Normalize RGB to [0, 1]
    }));
  };

  return (
    <div>
      <div ref={vtkContainerRef} />
      <table
        style={{
          position: 'absolute',
          top: '25px',
          left: '25px',
          background: 'white',
          padding: '12px',
		  width:'250px'
        }}
      >
        <tbody>
          <tr>
            <td>
              <select
                value={representation}
                style={{ width: '100%' }}
                onChange={(ev) => setRepresentation(Number(ev.target.value))}
              >
                <option value="0">Points</option>
                <option value="1">Wireframe</option>
                <option value="2">Surface</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>
              <input
                type="file"
                accept=".stl"
                multiple
                onChange={handleFileInput}
              />
            </td>
          </tr>
        </tbody>
      </table>
      {clickedFileName && (
        <div
          style={{
            position: 'absolute',
            top: '95px',
            left: '24px',
            background: 'white',
            padding: '12px',
            border: '1px solid black',
			width:'257px'
          }}
        >
          Clicked File: {clickedFileName}
        </div>
      )}
      {stlFiles.map((file) => (
        <div
          key={file.name}
          style={{
            position: 'absolute',
            top: '140px',
            left: '24px',
            background: 'white',
            padding: '8px',
            marginBottom: '5px',
			width:'266px'
          }}
        >
          <label>
            {file.name} Color:
            <input
              type="color"
              value={rgbToHex(
                ...(colorScheme[file.name] || [1, 1, 1]).map((c) => Math.round(c * 255))
              )}
              onChange={(e) => {
                const hex = e.target.value;
                const rgb = hexToRgb(hex);
                if (rgb) handleColorChange(file.name, rgb);
              }}
            />
          </label>
        </div>
      ))}
    </div>
  );
}

export default Annotations;

// Utility functions
function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')}`;
}

function hexToRgb(hex) {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  return match
    ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)]
    : null;
}
