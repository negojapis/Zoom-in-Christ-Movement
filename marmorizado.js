// A imagem fornece a textura. O shader Silk de referência inspira a
// ondulação e a torção local da arte, mantendo sua paleta original.
const marbleVertex = `
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = position * .5 + .5;
    gl_Position = vec4(position, 0., 1.);
  }
`;

const marbleFragment = `
  precision mediump float;
  varying vec2 uv;
  uniform sampler2D artwork;
  uniform vec4 scene;
  uniform vec3 pointer;
  void main() {
    vec2 p = uv;
    vec2 delta = (p - pointer.xy) * vec2(scene.x, 1.);
    float influence = (1. - smoothstep(0., 1.4, length(delta))) * pointer.z;
    float angle = .92 * influence;
    mat2 turn = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    p = pointer.xy + (turn * delta) / vec2(scene.x, 1.);
    vec2 sampleUv = vec2(p.x, 1. - p.y);
    // Cover for a square artwork, with a small margin for distortion.
    sampleUv = (sampleUv - .5) * vec2(.89, .89 / scene.x) + vec2(.5, scene.y);
    sampleUv += vec2(
      sin(p.y * 7. + p.x * 9. + scene.z * .65) * .022,
      cos(p.x * 10. - scene.z * .58) * .019
    );
    gl_FragColor = texture2D(artwork, sampleUv);
  }
`;

function createMarbleProgram(gl) {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, marbleVertex], [gl.FRAGMENT_SHADER, marbleFragment]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      gl.deleteProgram(program);
      return null;
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function mountMarble(canvas, image) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return;
  const program = createMarbleProgram(gl);
  if (!program) return;

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  const scene = gl.getUniformLocation(program, 'scene');
  const pointer = gl.getUniformLocation(program, 'pointer');
  const band = canvas.parentElement;
  const center = band.classList.contains('marble-footer') ? .73 : .29;
  let frame = 0;
  let previous = 0;
  let time = 0;
  let visible = false;
  let width = 1;
  let height = 1;
  let x = .5;
  let y = .5;
  let target = 0;
  let influence = 0;

  function draw(now) {
    frame = 0;
    time += previous ? Math.min(.05, (now - previous) / 1000) : 0;
    previous = now;
    influence += (target - influence) * .13;
    gl.uniform4f(scene, Math.max(1, width / height), center, time, 0);
    gl.uniform3f(pointer, x, y, influence);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (visible && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function refresh() {
    cancelAnimationFrame(frame);
    draw(performance.now());
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    canvas.width = Math.min(1536, width);
    canvas.height = Math.max(1, Math.round(height * canvas.width / width));
    gl.viewport(0, 0, canvas.width, canvas.height);
    refresh();
  }

  band.addEventListener('pointermove', event => {
    const bounds = band.getBoundingClientRect();
    x = (event.clientX - bounds.left) / bounds.width;
    y = 1 - (event.clientY - bounds.top) / bounds.height;
    target = 1;
  }, { passive: true });
  for (const type of ['pointerleave', 'pointerup', 'pointercancel']) {
    band.addEventListener(type, () => { target = 0; }, { passive: true });
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    previous = 0;
    refresh();
  }).observe(band);
  new ResizeObserver(resize).observe(band);
  document.addEventListener('visibilitychange', () => {
    previous = 0;
    refresh();
  });
  canvas.addEventListener('webglcontextlost', () => {
    cancelAnimationFrame(frame);
    canvas.style.visibility = 'hidden';
  });
  resize();
}

const marbleArtwork = new Image();
marbleArtwork.addEventListener('load', () => {
  document.querySelectorAll('.marble-canvas').forEach(canvas => mountMarble(canvas, marbleArtwork));
});
marbleArtwork.src = 'marmorizado.webp';
