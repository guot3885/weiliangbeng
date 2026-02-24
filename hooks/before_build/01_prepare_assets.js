#!/usr/bin/env node

/**
 * 构建前准备钩子脚本
 * 用于在构建前执行一些准备工作，如资源复制、配置检查等
 */

const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '../../');

console.log('执行构建前准备工作...');

// 检查必要的目录是否存在
const requiredDirs = [
  'www/assets/icons',
  'www/assets/splash',
  'res/icon/android',
  'res/screen/android'
];

requiredDirs.forEach(dir => {
  const dirPath = path.join(projectRoot, dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`创建目录: ${dir}`);
    shell.mkdir('-p', dirPath);
  }
});

// 检查必要的文件是否存在
const requiredFiles = [
  'www/assets/icons/icon-192x192.png',
  'www/assets/splash/splash.png',
  'res/icon/android/icon-36-ldpi.png',
  'res/icon/android/icon-48-mdpi.png',
  'res/icon/android/icon-72-hdpi.png',
  'res/icon/android/icon-96-xhdpi.png',
  'res/icon/android/icon-144-xxhdpi.png',
  'res/icon/android/icon-192-xxxhdpi.png',
  'res/screen/android/splash-ldpi.png',
  'res/screen/android/splash-mdpi.png',
  'res/screen/android/splash-hdpi.png',
  'res/screen/android/splash-xhdpi.png',
  'res/screen/android/splash-xxhdpi.png',
  'res/screen/android/splash-xxxhdpi.png'
];

let missingFiles = [];
requiredFiles.forEach(file => {
  const filePath = path.join(projectRoot, file);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(file);
  }
});

// 如果有缺失的文件，尝试从其他位置复制或生成
if (missingFiles.length > 0) {
  console.log('发现缺失的文件，尝试修复...');
  
  // 检查是否有主图标文件
  const mainIconPath = path.join(projectRoot, 'www/assets/icons/icon-192x192.png');
  if (fs.existsSync(mainIconPath)) {
    console.log('使用主图标文件生成其他尺寸的图标...');
    
    // 定义需要的图标尺寸
    const iconSizes = [
      { name: 'icon-36-ldpi.png', size: '36x36' },
      { name: 'icon-48-mdpi.png', size: '48x48' },
      { name: 'icon-72-hdpi.png', size: '72x72' },
      { name: 'icon-96-xhdpi.png', size: '96x96' },
      { name: 'icon-144-xxhdpi.png', size: '144x144' },
      { name: 'icon-192-xxxhdpi.png', size: '192x192' }
    ];
    
    // 复制图标到res目录
    iconSizes.forEach(icon => {
      const destPath = path.join(projectRoot, `res/icon/android/${icon.name}`);
      if (!fs.existsSync(destPath)) {
        console.log(`复制图标: ${icon.name}`);
        shell.cp(mainIconPath, destPath);
      }
    });
  }
  
  // 检查是否有主启动画面文件
  const mainSplashPath = path.join(projectRoot, 'www/assets/splash/splash.png');
  if (fs.existsSync(mainSplashPath)) {
    console.log('使用主启动画面文件生成其他尺寸的启动画面...');
    
    // 定义需要的启动画面尺寸
    const splashSizes = [
      { name: 'splash-ldpi.png', size: '200x320' },
      { name: 'splash-mdpi.png', size: '320x480' },
      { name: 'splash-hdpi.png', size: '480x800' },
      { name: 'splash-xhdpi.png', size: '720x1280' },
      { name: 'splash-xxhdpi.png', size: '960x1600' },
      { name: 'splash-xxxhdpi.png', size: '1280x1920' }
    ];
    
    // 复制启动画面到res目录
    splashSizes.forEach(splash => {
      const destPath = path.join(projectRoot, `res/screen/android/${splash.name}`);
      if (!fs.existsSync(destPath)) {
        console.log(`复制启动画面: ${splash.name}`);
        shell.cp(mainSplashPath, destPath);
      }
    });
  }
}

// 检查config.xml是否存在
const configPath = path.join(projectRoot, 'config.xml');
if (!fs.existsSync(configPath)) {
  console.error('错误: config.xml文件不存在!');
  process.exit(1);
}

// 检查package.json是否存在
const packagePath = path.join(projectRoot, 'package.json');
if (!fs.existsSync(packagePath)) {
  console.error('错误: package.json文件不存在!');
  process.exit(1);
}

// 检查www目录下的主要文件是否存在
const wwwFiles = ['index.html', 'style.css', 'script.js', 'manifest.json'];
let missingWwwFiles = [];

wwwFiles.forEach(file => {
  const filePath = path.join(projectRoot, 'www', file);
  if (!fs.existsSync(filePath)) {
    missingWwwFiles.push(file);
  }
});

if (missingWwwFiles.length > 0) {
  console.error(`错误: www目录下缺少必要文件: ${missingWwwFiles.join(', ')}`);
  process.exit(1);
}

console.log('构建前准备工作完成!');