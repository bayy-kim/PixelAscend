const fs = require("fs");
const path = require("path");

function processDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    let newName = file;
    if (file.startsWith("ANIMASI _BERJALAN")) {
      newName = file.replace("ANIMASI _BERJALAN", "walk_");
    } else if (file.startsWith("POV")) {
      newName = file.replace("POV", "pov_");
    }

    if (newName !== file) {
      const oldPath = path.join(dirPath, file);
      const newPath = path.join(dirPath, newName);
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed: ${file} -> ${newName}`);
    }
  });
}

processDir(path.join(__dirname, "../public/aset_karakter"));
processDir(path.join(__dirname, "../aset_karakter"));
console.log("Renaming complete!");
