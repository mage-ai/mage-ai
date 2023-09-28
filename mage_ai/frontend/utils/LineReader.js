/*
Written by Peter O. in 2015-2016.

Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/
If you like this, you should donate to Peter O.
at: http://peteroupc.github.io/
*/
export default function LineReader(file) {
  this.file = file;
  this.reader = new FileReader();
  this.offset = 0;
  this.currentLine = "";
  this.bufferOffset = 0;
  this.lastBuffer = null;
  this.callback = null;
  this.omittedCR = false;
  this.sawCR = false;
  this.endCallback = null;
  this.decodeOptions = {
    "stream": true
  }
  this.decoder = new TextDecoder("utf-8", {
    "ignoreBOM": true
  });
  this.reader.addEventListener("load", this._viewLoaded.bind(this));
  this.reader.addEventListener("error", this._error.bind(this));
}
LineReader.prototype._error = function(e) {
  throw e;
}
LineReader.prototype._readFromView = function(a, offset) {
  for (var i = offset; i < a.length; i++) {
    // Treats LF and CRLF as line breaks
    if (a[i] == 0x0A) {
      // Line feed read
      var lineEnd = (this.sawCR ? i - 1 : i);
      if (lineEnd > 0) {
        this.currentLine += this.decoder.decode(a.slice(this.bufferOffset, lineEnd), this.decodeOptions);
      }
      if (this.callback) this.callback(this.currentLine)
      this.decoder.decode(new Uint8Array([]))
      this.currentLine = "";
      this.sawCR = false;
      this.bufferOffset = i + 1;
      this.lastBuffer = a;
    } else if (a[i] == 0x0D) {
      if (this.omittedCR) this.currentLine += "\r";
      this.sawCR = true;
    } else if (this.sawCR) {
      if (this.omittedCR) this.currentLine += "\r";
      this.sawCR = false;
    }
    this.omittedCR = false;
  }
  if (this.bufferOffset != a.length) {
    // Decode the end of the line if no current line was reached
    var lineEnd = (this.sawCR ? a.length - 1 : a.length);
    if (lineEnd > 0) {
      this.currentLine += this.decoder.decode(a.slice(this.bufferOffset, lineEnd), this.decodeOptions);
    }
    this.omittedCR = this.sawCR;
  }
}
LineReader.prototype._viewLoaded = function() {
  var a = new Uint8Array(this.reader.result);
  if (a.length > 0) {
    this.bufferOffset = 0;
    this._readFromView(a, 0);
    this.offset += a.length;
    var s = this.file.slice(this.offset, this.offset + 256);
    this.reader.readAsArrayBuffer(s);
  } else {
    if (this.callback && this.currentLine.length > 0) {
      this.callback(this.currentLine);
    }
    this.decoder.decode(new Uint8Array([]))
    this.currentLine = "";
    this.sawCR = false;
    if (this.endCallback) {
      this.endCallback();
    }
  }
}
LineReader.prototype.readLines = function(callback, endCallback) {
  this.callback = callback;
  this.endCallback = endCallback;
  var s = this.file.slice(this.offset, this.offset + 8192);
  this.reader.readAsArrayBuffer(s);
}
if (typeof exports != "undefined") exports.LineReader = LineReader;
