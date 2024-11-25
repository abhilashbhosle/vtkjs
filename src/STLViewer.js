import { useState, useRef, useEffect } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkSTLReader from '@kitware/vtk.js/IO/Geometry/STLReader';

function STLViewer() {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);
  const [representation, setRepresentation] = useState(2);
  const [stlFiles, setStlFiles] = useState([]);

  useEffect(() => {
    if (!context.current) {
      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkContainerRef.current,
      });

      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow();

      context.current = {
        fullScreenRenderer,
        renderWindow,
        renderer,
        actors: [], // Store actors for each STL file
      };
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

      // Process each STL file
      stlFiles.forEach((file) => {
        const readerFile = new FileReader();
        const reader = vtkSTLReader.newInstance();
        const mapper = vtkMapper.newInstance();
        const actor = vtkActor.newInstance();

        readerFile.onload = (e) => {
          reader.parseAsArrayBuffer(e.target.result);
          mapper.setInputConnection(reader.getOutputPort());
          actor.setMapper(mapper);
          actor.getProperty().setRepresentation(representation);
          renderer.addActor(actor);
          actors.push(actor); // Track the actor
          renderer.resetCamera();
          renderWindow.render();
        };

        readerFile.readAsArrayBuffer(file);
      });
    }
  }, [stlFiles, representation]);

  const handleFileInput = (event) => {
    const files = Array.from(event.target.files);
    setStlFiles(files);
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
    </div>
  );
}

export default STLViewer;
