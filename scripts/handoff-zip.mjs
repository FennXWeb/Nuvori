// Dependency-free, uncompressed ZIP writer. Audio is already compressed.
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i=0;i<8;i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function createZip(entries) {
  const encoder=new TextEncoder(), chunks=[], directory=[];
  let offset=0;
  for (const {name, data} of entries) {
    const filename=encoder.encode(name), bytes=typeof data==='string'?encoder.encode(data):data;
    const crc=crc32(bytes), local=new Uint8Array(30+filename.length), l=new DataView(local.buffer);
    l.setUint32(0,0x04034b50,true); l.setUint16(4,20,true); l.setUint16(6,0x800,true);
    l.setUint16(12,33,true); l.setUint32(14,crc,true); l.setUint32(18,bytes.length,true); l.setUint32(22,bytes.length,true); l.setUint16(26,filename.length,true); local.set(filename,30);
    chunks.push(local,bytes);
    const central=new Uint8Array(46+filename.length), c=new DataView(central.buffer);
    c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x800,true); c.setUint16(14,33,true); c.setUint32(16,crc,true); c.setUint32(20,bytes.length,true); c.setUint32(24,bytes.length,true); c.setUint16(28,filename.length,true); c.setUint32(42,offset,true); central.set(filename,46); directory.push(central);
    offset+=local.length+bytes.length;
  }
  const directorySize=directory.reduce((n,b)=>n+b.length,0), end=new Uint8Array(22), e=new DataView(end.buffer);
  e.setUint32(0,0x06054b50,true); e.setUint16(8,entries.length,true); e.setUint16(10,entries.length,true); e.setUint32(12,directorySize,true); e.setUint32(16,offset,true);
  return new Blob([...chunks,...directory,end],{type:'application/zip'});
}
