/*  Bloodwych GFX viewer by DrSnuggles
    License : Public Domain
 */

"use strict";

window.BWGFX = (function (my) {
  //
  // Init
  //
  const debug = true,
  // Default palette
  // https://github.com/HoraceAndTheSpider/Bloodwych-68k/wiki/Game-Palette
  defaultCols = [ // Hex RGBA
    [0x00, 0x00, 0x00, 0xFF], // 00: $0000 (Black)
    [0x40, 0x40, 0x40, 0xFF], // 01: $0444 (Dark Grey)
    [0x60, 0x60, 0x60, 0xFF], // 02: $0666 (Grey)
    [0x80, 0x80, 0x80, 0xFF], // 03: $0888 (Light Grey)
    [0xA0, 0xA0, 0xA0, 0xFF], // 04: $0AAA (Bright Grey)
    [0x20, 0x90, 0x20, 0xFF], // 05: $0292 (Green)
    [0x10, 0xC0, 0x10, 0xFF], // 06: $01C1 (Light Green)
    [0x00, 0x00, 0xE0, 0xFF], // 07: $000E (Dark Blue)
    [0x40, 0x80, 0xE0, 0xFF], // 08: $048E (Light Blue)
    [0x80, 0x20, 0x10, 0xFF], // 09: $0821 (Brown)
    [0xB0, 0x30, 0x10, 0xFF], // 10: $0B31 (Brownish Red)
    [0xE0, 0x90, 0x60, 0xFF], // 11: $0E96 (Orange)
    [0xD0, 0x00, 0x00, 0xFF], // 12: $0D00 (Red)
    [0xF0, 0xD0, 0x00, 0xFF], // 13: $0FD0 (Yellow)
    [0xE0, 0xE0, 0xE0, 0xFF], // 14: $0EEE (White)
    [0x00, 0x00, 0x00, 0x00], // 15: transparent [0xC0, 0x00, 0x80, 0xFF], // $0C08
  ],
  // sets
  // https://github.com/HoraceAndTheSpider/Bloodwych-68k/wiki/Colouring-Large-Monsters
  sets = [
    [ 3, 4,14], // 00: Grey
    [ 8, 4,14], // 01: Light Blue
    [ 5, 6,14], // 02: Light Green
    [ 9,10,11], // 03: Brownish Red
    [ 9,12,11], // 04: Red
    [10,11,13], // 05: Light Orange
    [11,13,14], // 06: Yellowy White
    [12,11,13], // 07: Golden Orange
    [ 2, 3, 4], // 08: Darker grey
    [ 8, 4,13], // 09: Light blue /yellow
    [ 5, 6,13], // 0A: Green/Yellow
    [ 7, 8, 4],//[ 7, 8, 4], // 0B: Darker blue/grey
    [ 7, 8,13], // 0C: Blue/Yellow ??
    [ 4, 8,12], // 0D: RAW
  ];
  let f = {}, // main object
  size;

  //
  // Private
  //
  function log(out) {
    if (debug) console.log("BWGFX:", out);
    const dbg_DOM = document.getElementById("info");
    if (dbg_DOM) dbg_DOM.innerHTML += out +"<br/>";
  }
  function xhr(url, cb) {
    log("xhr: "+ url);
    const x = new XMLHttpRequest();
    x.open("GET", url, true);
    x.responseType = "arraybuffer";
    x.onload = function() {
      log("File loaded");
      const ret = (x.status == 200) ? x.response : [];
      if (cb) cb(ret);
    }
    x.send();
  }
  function load(url, canv) {
    log("load: "+ url);
    xhr(url, function(buf){
      /*
      xhr(url.replace('/bw-gfx/','/bw-data/').toLowerCase()+'.colours', function(colours){
        parse(buf, colours, canv);
      });
      */
      parse(buf, null, canv);
    });
  }
  function parse(buf, col, canv) {
    f = {}
    f.data = new Uint8Array(buf);
    f.idx = 0;
    f.col = new Uint8Array(col); // Behemoth [9, 11, 10, 8, 3, 4, 5, 7] or Dragon [11, 10, 4, 8, 7, 9, 5, 6]
    f.canv = canv;//document.createElement('canvas');
    f.ctx = f.canv.getContext('2d');

    render();
  }
  function render() {
    if (!f.canv) return // early exit
    const renderWidth = range_width.value;
    if (renderWidth > f.data.length) return // early exit
    f.canv.width = renderWidth; // steps = 4
    f.canv.height = f.data.length / f.canv.width; // todo: round up to 4 ???
    const imgData = f.ctx.createImageData(f.canv.width,f.canv.height)

    f.canv.style.backgroundColor = col_bg.value;
    
    // overwrite colors with loaded ones (colorNums: 4, 8, 12)
    let cols = [...defaultCols]
    // no, i will make dropdown for that
    // just pick selected colset
    let activeColSet = sets[ colsetselect.selectedIndex ];
    //console.log(f.col, colsetselect.selectedIndex, activeColSet)
    
    cols[4] = defaultCols[ activeColSet[0] ];
    cols[8] = defaultCols[ activeColSet[1] ];
    cols[12] = defaultCols[ activeColSet[2] ];
    
    // data
    // https://github.com/HoraceAndTheSpider/Bloodwych-68k/wiki/Atari-ST-Raw-Data-Format
    // Atari 320x200, 16 color, you always have one quadword for one pixelblock of 16 pixels
    // Each word describes one plane and got 16 bits for the 16 pixels
    // 16 colors = 4 planes = quadword, word = 2bytes -> 4width x 4height x 4planes = 64 bits = 8 bytes OK
    f.pixelblocksTotal = f.data.length/8;
    //log(f.pixelblocksTotal);
    
    for (let i = 0, dataIndex = 0, n = f.pixelblocksTotal; i < n; i++) {
      const p = readPixelBlock(f);
    
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const pixelColorNum = get_atari_pixelcolor(p,y*4+x);
          const pixelCol = cols[pixelColorNum];
          //console.log('pixelBlock '+i, y*4+x, pixelColorNum, cols[pixelColorNum]);
          imgData.data[dataIndex]     = pixelCol[0];// R
          imgData.data[dataIndex + 1] = pixelCol[1];// G
          imgData.data[dataIndex + 2] = pixelCol[2];// B
          imgData.data[dataIndex + 3] = pixelCol[3];// A
          dataIndex += 4;
        }
      }
      
    }
    f.idx = 0;
    f.ctx.putImageData(imgData, 0, 0);

    if (dbg_DIM) dbg_DIM.innerText = imgData.width +'x'+ imgData.height;
  }
  function save() {
    let name = dataselect.value
    if (name.indexOf('bw-sfx') > 0) return // early exit
    name = name+'_'+f.canv.width+'.png';
    
    const a = document.createElement('a');
    let d = new Date();
    d = d.toISOString();
    // PNG
    a.setAttribute('download', name);
    const dataURL = f.canv.toDataURL('image/png');
    const url = dataURL.replace(/^data:image\/png/,'data:application/octet-stream');
    f.canv.toBlob(function(blob) {
      const url = URL.createObjectURL(blob);
      a.setAttribute('href', url);
      a.click();
      log('Screenshot saved as: '+ name);
    });
  }
  function readPixelBlock(f) {
    return [f.data[f.idx++], f.data[f.idx++], f.data[f.idx++], f.data[f.idx++], f.data[f.idx++], f.data[f.idx++], f.data[f.idx++], f.data[f.idx++] ];
  }
  // https://github.com/HoraceAndTheSpider/Bloodwych-68k/wiki/Atari-ST-Raw-Data-Format
  // Original source by: bit
  // p = one pixelblock of 16 pixels = 4width x 4height x 4planes = 64 bits = 8 bytes
  // n = selected pixelnumber
  function get_atari_pixelcolor(p, n) {
    switch (n) {
      case  0: return ((p[6] & 0x80) >> 4) | ((p[4] & 0x80) >> 5) | ((p[2] & 0x80) >> 6) | ((p[0] & 0x80) >> 7);
      case  1: return ((p[6] & 0x40) >> 3) | ((p[4] & 0x40) >> 4) | ((p[2] & 0x40) >> 5) | ((p[0] & 0x40) >> 6);
      case  2: return ((p[6] & 0x20) >> 2) | ((p[4] & 0x20) >> 3) | ((p[2] & 0x20) >> 4) | ((p[0] & 0x20) >> 5);
      case  3: return ((p[6] & 0x10) >> 1) | ((p[4] & 0x10) >> 2) | ((p[2] & 0x10) >> 3) | ((p[0] & 0x10) >> 4);
      case  4: return ((p[6] &  0x8)     ) | ((p[4] &  0x8) >> 1) | ((p[2] &  0x8) >> 2) | ((p[0] &  0x8) >> 3);
      case  5: return ((p[6] &  0x4) << 1) | ((p[4] &  0x4)     ) | ((p[2] &  0x4) >> 1) | ((p[0] &  0x4) >> 2);
      case  6: return ((p[6] &  0x2) << 2) | ((p[4] &  0x2) << 1) | ((p[2] &  0x2)     ) | ((p[0] &  0x2) >> 1);
      case  7: return ((p[6] &  0x1) << 3) | ((p[4] &  0x1) << 2) | ((p[2] &  0x1) << 1) | ((p[0] &  0x1)     );
      case  8: return ((p[7] & 0x80) >> 4) | ((p[5] & 0x80) >> 5) | ((p[3] & 0x80) >> 6) | ((p[1] & 0x80) >> 7);
      case  9: return ((p[7] & 0x40) >> 3) | ((p[5] & 0x40) >> 4) | ((p[3] & 0x40) >> 5) | ((p[1] & 0x40) >> 6);
      case 10: return ((p[7] & 0x20) >> 2) | ((p[5] & 0x20) >> 3) | ((p[3] & 0x20) >> 4) | ((p[1] & 0x20) >> 5);
      case 11: return ((p[7] & 0x10) >> 1) | ((p[5] & 0x10) >> 2) | ((p[3] & 0x10) >> 3) | ((p[1] & 0x10) >> 4);
      case 12: return ((p[7] &  0x8)     ) | ((p[5] &  0x8) >> 1) | ((p[3] &  0x8) >> 2) | ((p[1] &  0x8) >> 3);
      case 13: return ((p[7] &  0x4) << 1) | ((p[5] &  0x4)     ) | ((p[3] &  0x4) >> 1) | ((p[1] &  0x4) >> 2);
      case 14: return ((p[7] &  0x2) << 2) | ((p[5] &  0x2) << 1) | ((p[3] &  0x2)     ) | ((p[1] &  0x2) >> 1);
      case 15: return ((p[7] &  0x1) << 3) | ((p[5] &  0x1) << 2) | ((p[3] &  0x1) << 1) | ((p[1] &  0x1)     );
    }
    return 0;
  }

  //
  // Public
  //
  my.load = load;
  my.render = render;
  my.save = save;

  //
  // Exit
  //
  return my;
}({}));
