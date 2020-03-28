
const resizeState = (state, width, height) => {
  // get the old data
  const oldWidth = state.width || 1;
  const oldHeight = state.height || 1;

  // get the relative scale
  const scales = [width / oldWidth, height / oldHeight];
  const logScales = scales.map(s => Math.abs(Math.log(s)));
  const scale = scales[logScales.indexOf(Math.min(...logScales))];

  // scale the window
  const windowFrame = withWorldMatrix(
    state.children[0],
    [[width/2, 0, width/2], [0, -height/2, height/2], [0, 0, 1]],
  );

  // scale the plane relatively
  const yellow = transformedByMatrix(
    state.children[1],
    [
      [scale, 0, (width - oldWidth)/2],
      [0, scale, (height - oldHeight)/2],
      [0, 0, 1]
    ],
    { worldMatrix: [[1, 0, oldWidth/2], [0, 1, oldHeight/2], [0, 0, 1]] }
  );
  return { 
    type: 'root',
    width,
    height,
    children: [windowFrame, yellow]
  };
}
