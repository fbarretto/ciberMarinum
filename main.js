/**
 * dwgl.js - a very lightweight webgl wrapper.
 * 
 * Copyright 2018 by Thomas Diewald (https://www.thomasdiewald.com)
 *
 *           MIT License: https://opensource.org/licenses/MIT
 *            ource: https://github.com/diwi/p5.EasyCam (will be moved)
 *
 * versions: webgl1, webgl2
 *
 */

 
/**
 * This is a port from the PixelFlow-Library.
 * https://github.com/diwi/PixelFlow/tree/master/examples/Miscellaneous/ReactionDiffusion
 */
 
 
'use strict';

let debug = false;

// framebuffer
let fbo;

// tex-struct (ping-pong)
let tex = 
{
  src : null,
  dst : null,
  swap : function(){
    let tmp = this.src;
    this.src = this.dst;
    this.dst = tmp;
  }
};

// shader
let shaderfiles = {};
let shader_grayscott;
let shader_display;

// offscreen resolution scale factor.
let SCREEN_SCALE = 0.5; 


//feed range = 0.012 - 0.25
//kill range = 0.045 - 0.055
//da = 1
//db = 0.4 - 0.6
//iter = 2 - 10

// reaction diffusion parameters
let rdDef = {
  da      : 1.0,
  db      : 0.6,
  feed    : 0.015,
  kill    : 0.05,
  dt      : 1.0,
  iter    : 20,
};

let minFeed = 0.012;
let maxFeed = 0.025;
let minKill = 0.045;
let maxKill = 0.055;
let minDb = 0.4;
let maxDb = 0.6;
let minIter = 2;
let maxIter = 10;


// shading colors
let pallette = [
  1.00, 1.00, 1.00,
  0.00, 0.40, 0.80,
  0.20, 0.00, 0.20,
  1.00, 0.80, 0.40,
  0.50, 0.25, 0.12,     
  0.50, 0.50, 0.50,
  0.00, 0.00, 0.00
];

let HSBcolors = Array(pallette.length/3).fill(0);

let bodypix;
let video;
let segmentation;

const options = {
  outputStride: 8, // 8, 16, or 32, default is 16
  segmentationThreshold: 0.3, // 0 - 1, defaults to 0.5
};

function preload() {
  bodypix = ml5.bodyPix(options);
}


function setup() { 
  pixelDensity(1);
  
  // webgl canvas
  createCanvas(windowWidth, windowHeight, WEBGL);
  frameRate(30);

  video = createCapture(VIDEO, videoReady);
  video.size(width, height);
  video.hide();
   
  // webgl context
  let gl = this._renderer.GL;
  
  // webgl version (1=webgl1, 2=webgl2)
  let VERSION = gl.getVersion();
  
  console.log("WebGL Version: "+VERSION);
  

  // get some webgl extensions
  // if(VERSION === 1){
    // let ext = gl.newExt(['OES_texture_float', 'OES_texture_float_linear'], true);
  // }
  // if(VERSION === 2){
    // let ext = gl.newExt(['EXT_color_buffer_float'], true);
  // }
  
  // beeing lazy ... load all available extensions.
  gl.newExt(gl.getSupportedExtensions(), true);

  
  // create FrameBuffer for offscreen rendering
  fbo = gl.newFramebuffer();

  // create Textures for multipass rendering
  let def = {
     target   : gl.TEXTURE_2D
    ,iformat  : gl.RGBA32F
    ,format   : gl.RGBA
    ,type     : gl.FLOAT
    ,wrap     : gl.CLAMP_TO_EDGE
    ,filter   : [gl.NEAREST, gl.LINEAR]
  }

  let tex_w = ceil(width * SCREEN_SCALE);
  let tex_h = ceil(height * SCREEN_SCALE);

  tex.src = gl.newTexture(tex_w, tex_h, def);
  tex.dst = gl.newTexture(tex_w, tex_h, def);

  // Shader source, depending on available webgl version
  // let fs_grayscott = document.getElementById("webgl"+VERSION+".fs_grayscott").textContent;
  // let fs_display   = document.getElementById("webgl"+VERSION+".fs_display"  ).textContent;
	
  let fs_grayscott = shaderfiles["webgl"+VERSION+".fs_grayscott"];
  let fs_display   = shaderfiles["webgl"+VERSION+".fs_display"];
  // crreate Shader
  shader_grayscott = new Shader(gl, {fs:fs_grayscott});
  shader_display   = new Shader(gl, {fs:fs_display  });
  // randomizeColors();
 
  // place initial samples
  initColors();
  updatePallette();
  // initHSBColors()
  initRD();
  // noLoop();
  getData("http://servicos.cptec.inpe.br/XML/cidade/241/todos/tempos/ondas.xml").then((data) => {console.log(data)});
}

function initColors() {
  console.log(pallette);
  for(let i = 0; i < pallette.length; i+=3){
    HSBcolors[i/3] = hue(color(pallette[i], pallette[i+1], pallette[i+2]));
    console.log("pos: " + i/3);
    console.log("hue: " + hue(color(pallette[i], pallette[i+1], pallette[i+2])));
  }
  console.log(HSBcolors);
}

function initHSBColors() {
  for (let i=0; i<HSBcolors.length; i++) {
    HSBcolors[i] = random(360);
  }
  console.log(HSBcolors);
}

function updatePallette() {
  for (let i=0; i<HSBcolors.length; i++) {
    HSBcolors[i] = (HSBcolors[i] + 1) % 360;
  }

  for(let i = 0; i < pallette.length; i+=3){
    let c = color(`hsb(${HSBcolors[i/3]}, 100%, 100%)`);
    pallette[i] = red(c)/255.0;
    pallette[i+1] = green(c)/255.0;
    pallette[i+2] = blue(c)/255.0;
  }
  // console.log(pallette);
}

function videoReady() {
  bodypix.segment(video, gotResults);
}

function windowResized() {
	if(!fbo) return;
  let w = windowWidth;
  let h = windowHeight;
  resizeCanvas(w, h);
  
  let tex_w = ceil(w * SCREEN_SCALE);
  let tex_h = ceil(h * SCREEN_SCALE);
  
  tex.src.resize(tex_w, tex_h);
  tex.dst.resize(tex_w, tex_h);
  
  initRD();
}

function randomizeColors(){
  let num = pallette.length /3;
  for(let i = 1; i < num-1; i++){
    let id = i * 3;
    let r = random(1);
    let g = random(1);
    let b = random(1);
    
    pallette[id + 0] = r;
    pallette[id + 1] = g;
    pallette[id + 2] = b;
  }
}

function keyReleased(){
  if(key === 'C'){
    randomizeColors();
  }
}

function draw(){
  if(!fbo) return;
  // ortho(0, width, -height, 0, 0, 20000);
  push();
  ortho();
  translate(-width/2, -height/2, 0);
  updateRD();
  updatePallette();
  pop();

  

  let w = tex.dst.w / SCREEN_SCALE;
  let h = tex.dst.h / SCREEN_SCALE;
  

  // display result
  shader_display.viewport(0, 0, w, h);
  shader_display.begin();
  shader_display.uniformF('PALLETTE', pallette, 7); 
  shader_display.uniformT('tex', tex.src);
  shader_display.uniformF('wh_rcp', [1.0/w, 1.0/h]);
  shader_display.quad();
  shader_display.end();
  
  if(frameCount % 60 == 0 && debug)
    console.log(frameRate());
}



function initRD(){
  ortho();
  // translate(-width/2, -height/2, 0);
    
  let gl = fbo.gl;
  
  // bind framebuffer and texture for offscreenrendering
  fbo.begin(tex.dst);
  
  let w = tex.dst.w;
  let h = tex.dst.h;
  
  gl.viewport(0, 0, w, h);
  gl.clearColor(1.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  
  // < native p5 here
  noStroke();
  fill(0,255,0);
  ellipse(-100, 0, 100, 100);
  ellipse(+100, 0, 100, 100);
  ellipse(0, -100, 100, 100);
  ellipse(0, +100, 100, 100);
  // >
  tex.swap();
  fbo.end();

}

function updateRD(){

  let gl = fbo.gl;

  // multipass rendering (ping-pong)
  for(let i = 0; i < rdDef.iter; i++){
    
    // set texture as rendertarget
    fbo.begin(tex.dst);
    
    let w = tex.dst.w;
    let h = tex.dst.h;
 
    // clear texture
    gl.viewport(0, 0, w, h);
    gl.clearColor(1.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    
    // apply shader
    shader_grayscott.begin();
    shader_grayscott.uniformF("dA"    , [rdDef.da]);
    shader_grayscott.uniformF("dB"    , [rdDef.db]);
    shader_grayscott.uniformF("feed"  , [rdDef.feed]);
    shader_grayscott.uniformF("kill"  , [rdDef.kill]);
    shader_grayscott.uniformF("dt"    , [rdDef.dt]);
    shader_grayscott.uniformF("wh_rcp", [1.0/w, 1.0/h]);
    shader_grayscott.uniformT("tex"   , tex.src);
    shader_grayscott.quad();
    shader_grayscott.end();
    
    
    if (segmentation) {
      // noStroke();
      // fill(0,255,0);
      ellipse(0,0,1,1);
      tint(0,255,0);
      push();
      translate(width,0); // move to far corner
      scale(-1.0,1.0); // flip x-axis backwards
      image(segmentation.backgroundMask, 0, 0, width, height);
      pop();
    }
    
    tex.swap();
  }
  
  fbo.end();
}

function gotResults(error, result) {
  if (error) {
    console.log(error);
    return;
  }
  segmentation = result;
  bodypix.segment(video, gotResults);
}
