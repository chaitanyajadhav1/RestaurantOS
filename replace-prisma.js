const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    if (filePath.includes('src\\lib\\prisma.ts') || filePath.includes('src/lib/prisma.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    if (content.includes('const prisma = new PrismaClient();')) {
      content = content.replace(/const prisma = new PrismaClient\(\);/g, '');
      modified = true;
    }

    if (content.includes('import { PrismaClient } from "@prisma/client";')) {
      content = content.replace(/import \{ PrismaClient \} from "@prisma\/client";/g, 'import { prisma } from "@/lib/prisma";\nimport { PrismaClient } from "@prisma/client";');
      modified = true;
    } else if (content.includes('import { PrismaClient')) {
       // It might be imported with other things
       // we will just inject our import
       if (!content.includes('import { prisma } from "@/lib/prisma";')) {
           content = 'import { prisma } from "@/lib/prisma";\n' + content;
           modified = true;
       }
    } else if (modified && !content.includes('import { prisma } from "@/lib/prisma";')) {
        content = 'import { prisma } from "@/lib/prisma";\n' + content;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});

// Also fix prisma/seed.ts
const seedPath = 'prisma/seed.ts';
if (fs.existsSync(seedPath)) {
  let content = fs.readFileSync(seedPath, 'utf8');
  if (content.includes('const prisma = new PrismaClient()')) {
    content = content.replace(/const prisma = new PrismaClient\(\)/g, 'const prisma = require("../src/lib/prisma").prisma');
    fs.writeFileSync(seedPath, content, 'utf8');
    console.log(`Updated ${seedPath}`);
  }
}
