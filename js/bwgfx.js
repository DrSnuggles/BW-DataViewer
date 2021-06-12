/*  Bloodwych GFX viewer by DrSnuggles
    License : Public Domain
 */

"use strict";

var BWGFX = (function (my) {
  //
  // Init
  //
  var f = {}; // main object
  var debug = true;
  var size;

  //
  // Private
  //
  function log(out) {
    if (debug) console.log("BWGFX:", out);
    var dbg_DOM = document.getElementById("info");
    if (dbg_DOM) dbg_DOM.innerHTML += out +"<br/>";
  }
  function xhr(url, cb) {
    log("xhr: "+ url);
    var x = new XMLHttpRequest();
    x.open("GET", url, true);
    x.responseType = "arraybuffer";
    x.onload = function() {
      log("File loaded");
      var ret = (x.status == 200) ? x.response : [];
      if (cb) cb(ret);
    }
    x.send();
  }
  function load(url, canv) {
    log("load: "+ url);
    xhr(url, function(buf){
      /*
      xhr(url.replace('/bw-gfx/','/bw-data/').toLowerCase()+'.colours', function(colours){
        xhr(url.replace('/bw-gfx/','/bw-data/').toLowerCase()+'.gradeoffset', function(gradeoffset){
          parse(buf, colours, gradeoffset, canv);
        });
      });
      */
      parse(buf, null, null, canv);
    });
  }
  function parse(buf, col, grade, canv) {
    f = {}
    f.data = new Uint8Array(buf); // 5096 bytes
    f.idx = 0;
    //f.i8 = new Int8Array(buf);
    f.col = new Uint8Array(col); // [9, 11, 10, 8, 3, 4, 5, 7]
    f.grade = new Uint8Array(grade); // 6
    f.canv = canv;//document.createElement('canvas');
    f.ctx = f.canv.getContext('2d');

    render();
  }
  function render() {
    if (!f.canv) return // early exit
    var renderWidth = range_width.value;
    if (renderWidth > f.data.length) return // early exit
    f.canv.width = renderWidth; // steps = 4
    f.canv.height = f.data.length / f.canv.width; // todo: round up to 4 ???
    var imgData = f.ctx.createImageData(f.canv.width,f.canv.height)

    // colors
    // https://github.com/HoraceAndTheSpider/Bloodwych-68k/wiki/Game-Palette
    //var cols = ['000','444','666','888','AAA','292','1C1','00E','48E','821','B31','E96','D00','FD0','EEE','C08']
    // Default palete in RGBA 32bit
    var cols = ['000000FF','404040FF','606060FF','808080FF','A0A0A0FF','209020FF','10C010FF','0000E0FF','4080E0FF','802010FF','B03010FF','E09060FF','D00000FF','F0D000FF','E0E0E0FF','C00080FF']
    cols[15] = '00000000'; // transparent
    
    // overwrite colors with loaded ones (colorNums: 4, 8, 12)
    
    // grade
    // https://github.com/HoraceAndTheSpider/Bloodwych-68k/wiki/Colouring-Large-Monsters
    
    // data
    // https://github.com/HoraceAndTheSpider/Bloodwych-68k/wiki/Atari-ST-Raw-Data-Format
    // Atari 320x200, 16 color, you always have one quadword for one pixelblock of 16 pixels
    // Each word describes one plane and got 16 bits for the 16 pixels
    // 16 colors = 4 planes = quadword, word = 2bytes -> 4width x 4height x 4planes = 64 bits = 8 bytes OK
    f.pixelblocksTotal = f.data.length/8;
    //log(f.pixelblocksTotal);
    
    var dataIndex = 0;
    for (var i = 0; i < f.pixelblocksTotal; i++) {
      var p = readPixelBlock(f);
    
      for (var y = 0; y < 4; y++) {
        for (var x = 0; x < 4; x++) {
          var pixelColorNum = get_atari_pixelcolor(p,y*4+x);
          var pixelCol = cols[pixelColorNum];
          //console.log('pixelBlock '+i, y*4+x, pixelColorNum, cols[pixelColorNum]);
          imgData.data[dataIndex] = parseInt(pixelCol.substr(0,2), 16);    // R // not performant, i know!
          imgData.data[dataIndex + 1] = parseInt(pixelCol.substr(2,2), 16);// G
          imgData.data[dataIndex + 2] = parseInt(pixelCol.substr(4,2), 16);// B
          imgData.data[dataIndex + 3] = parseInt(pixelCol.substr(6,2), 16);// A
          dataIndex += 4;
        }
      }
      
    }
    f.idx = 0;
    //f.ctx.fillStyle = col_bg.value;
    //f.ctx.fillRect(0, 0, f.canv.width, f.canv.height);
    f.canv.style.backgroundColor = col_bg.value;
    f.ctx.putImageData(imgData, 0, 0);

    if (dbg_DIM) dbg_DIM.innerText = imgData.width +'x'+ imgData.height;
  }
  function save() {
    var name = dataselect.value
    if (name.indexOf('bw-sfx') > 0) return // early exit
    name = name+'_'+f.canv.width+'.png';
    
    var a = document.createElement("a");
    var d = new Date();
    d = d.toISOString();
    // PNG
    a.setAttribute('download', name);
    var dataURL = f.canv.toDataURL('image/png');
    var url = dataURL.replace(/^data:image\/png/,'data:application/octet-stream');
    f.canv.toBlob(function(blob) {
      var url = URL.createObjectURL(blob);
      a.setAttribute('href', url);
      a.click();
      log('Screenshot saved as: '+ name);
    });
  }
  function readPixelBlock(f) {
    return [f.data[f.idx++], f.data[f.idx++], f.data[f.idx++], f.data[f.idx++], f.data[f.idx++], f.data[f.idx++], f.data[f.idx++], f.data[f.idx++] ];
  }
  // https://github.com/HoraceAndTheSpider/Bloodwych-68k/wiki/Atari-ST-Raw-Data-Format
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
}(BWGFX || {}));
