#!/bin/bash

# 医学微量泵计算工具 - APK构建脚本
# 用于自动化构建Android APK文件

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}医学微量泵计算工具 - APK构建脚本${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: Node.js 未安装!${NC}"
    echo -e "${YELLOW}请先安装 Node.js 14.0.0 或更高版本${NC}"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo -e "${RED}错误: npm 未安装!${NC}"
    echo -e "${YELLOW}请先安装 npm${NC}"
    exit 1
fi

# 检查Java是否安装
if ! command -v java &> /dev/null; then
    echo -e "${RED}错误: Java 未安装!${NC}"
    echo -e "${YELLOW}请先安装 JDK 8 或更高版本${NC}"
    exit 1
fi

# 检查Android SDK是否安装
if [ -z "$ANDROID_HOME" ]; then
    echo -e "${RED}错误: ANDROID_HOME 环境变量未设置!${NC}"
    echo -e "${YELLOW}请先安装 Android SDK 并设置 ANDROID_HOME 环境变量${NC}"
    exit 1
fi

# 显示版本信息
echo -e "${GREEN}环境检查通过!${NC}"
echo -e "${BLUE}Node.js 版本:${NC} $(node --version)"
echo -e "${BLUE}npm 版本:${NC} $(npm --version)"
echo -e "${BLUE}Java 版本:${NC} $(java -version 2>&1 | head -n 1)"
echo -e "${BLUE}Android SDK 路径:${NC} $ANDROID_HOME"

# 安装Cordova CLI（如果未安装）
if ! command -v cordova &> /dev/null; then
    echo -e "${YELLOW}Cordova CLI 未安装，正在安装...${NC}"
    npm install -g cordova
fi

echo -e "${BLUE}Cordova 版本:${NC} $(cordova --version)"

# 安装项目依赖
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}安装项目依赖...${NC}"
npm install

# 添加Android平台（如果未添加）
if [ ! -d "platforms/android" ]; then
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}添加Android平台...${NC}"
    cordova platform add android
else
    echo -e "${GREEN}Android平台已存在，跳过添加${NC}"
fi

# 更新Android平台
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}更新Android平台...${NC}"
cordova platform update android

# 安装插件
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}安装Cordova插件...${NC}"
cordova plugin add cordova-plugin-whitelist
cordova plugin add cordova-plugin-statusbar
cordova plugin add cordova-plugin-splashscreen
cordova plugin add cordova-plugin-file
cordova plugin add cordova-plugin-file-transfer
cordova plugin add cordova-plugin-android-permissions
cordova plugin add cordova-plugin-sharing
cordova plugin add cordova-plugin-dialogs

# 检查资源文件
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}检查资源文件...${NC}"

# 确保必要的目录存在
mkdir -p www/assets/icons
mkdir -p www/assets/splash
mkdir -p res/icon/android
mkdir -p res/screen/android

# 检查图标文件
if [ ! -f "www/assets/icons/icon-192x192.png" ]; then
    echo -e "${YELLOW}警告: 主图标文件不存在!${NC}"
    echo -e "${YELLOW}请确保 www/assets/icons/icon-192x192.png 存在${NC}"
fi

# 检查启动画面文件
if [ ! -f "www/assets/splash/splash.png" ]; then
    echo -e "${YELLOW}警告: 主启动画面文件不存在!${NC}"
    echo -e "${YELLOW}请确保 www/assets/splash/splash.png 存在${NC}"
fi

# 准备构建
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}准备构建...${NC}"
cordova prepare android

# 清理之前的构建
echo -e "${BLUE}清理之前的构建...${NC}"
cordova clean android

# 构建Debug版本
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}构建Debug版本...${NC}"
cordova build android --debug

# 检查Debug APK是否生成
if [ -f "platforms/android/app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo -e "${GREEN}Debug APK 构建成功!${NC}"
    echo -e "${BLUE}APK路径:${NC} platforms/android/app/build/outputs/apk/debug/app-debug.apk"
    
    # 复制Debug APK到项目根目录
    cp platforms/android/app/build/outputs/apk/debug/app-debug.apk ./medical-pump-calculator-debug.apk
    echo -e "${GREEN}Debug APK 已复制到项目根目录: medical-pump-calculator-debug.apk${NC}"
else
    echo -e "${RED}错误: Debug APK 构建失败!${NC}"
    exit 1
fi

# 询问是否构建Release版本
echo -e "${BLUE}========================================${NC}"
read -p "是否构建Release版本? (y/n): " build_release

if [ "$build_release" = "y" ] || [ "$build_release" = "Y" ]; then
    # 检查签名配置
    if [ ! -f "release-signing.properties" ]; then
        echo -e "${YELLOW}未找到签名配置文件，将创建一个示例配置文件${NC}"
        
        cat > release-signing.properties << EOL
# 签名配置示例
# 请填写您的签名信息并移除注释
# key.store=/path/to/keystore.jks
# key.store.password=your_keystore_password
# key.alias=your_key_alias
# key.alias.password=your_key_password
EOL
        
        echo -e "${YELLOW}已创建示例签名配置文件: release-signing.properties${NC}"
        echo -e "${YELLOW}请编辑此文件并填写您的签名信息${NC}"
        echo -e "${YELLOW}或者按 Ctrl+C 取消构建${NC}"
        
        read -p "是否继续构建未签名的Release版本? (y/n): " unsigned_release
        
        if [ "$unsigned_release" != "y" ] && [ "$unsigned_release" != "Y" ]; then
            echo -e "${BLUE}取消Release版本构建${NC}"
            exit 0
        fi
    fi
    
    # 构建Release版本
    echo -e "${BLUE}构建Release版本...${NC}"
    cordova build android --release
    
    # 检查Release APK是否生成
    if [ -f "platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk" ]; then
        echo -e "${GREEN}Release APK 构建成功!${NC}"
        echo -e "${BLUE}未签名APK路径:${NC} platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk"
        
        # 复制Release APK到项目根目录
        cp platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk ./medical-pump-calculator-unsigned.apk
        echo -e "${GREEN}未签名Release APK 已复制到项目根目录: medical-pump-calculator-unsigned.apk${NC}"
        
        # 如果有签名配置，尝试签名
        if [ -f "release-signing.properties" ] && grep -q "key.store=" release-signing.properties; then
            echo -e "${BLUE}========================================${NC}"
            echo -e "${BLUE}尝试签名APK...${NC}"
            
            # 加载签名配置
            source release-signing.properties
            
            if [ ! -z "$key.store" ] && [ ! -z "$key.store.password" ] && [ ! -z "$key.alias" ] && [ ! -z "$key.alias.password" ]; then
                # 检查keytool和jarsigner是否可用
                if command -v keytool &> /dev/null && command -v jarsigner &> /dev/null; then
                    # 签名APK
                    jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore "$key.store" -storepass "$key.store.password" -keypass "$key.alias.password" platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk "$key.alias"
                    
                    # 检查签名是否成功
                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}APK签名成功!${NC}"
                        
                        # 使用zipalign优化APK
                        if [ -f "$ANDROID_HOME/build-tools/30.0.3/zipalign" ]; then
                            echo -e "${BLUE}使用zipalign优化APK...${NC}"
                            "$ANDROID_HOME/build-tools/30.0.3/zipalign" -v 4 platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk ./medical-pump-calculator-release.apk
                            
                            if [ $? -eq 0 ]; then
                                echo -e "${GREEN}APK优化成功!${NC}"
                                echo -e "${GREEN}已签名并优化的APK路径:${NC} ./medical-pump-calculator-release.apk"
                            else
                                echo -e "${YELLOW}APK优化失败，使用未优化的签名APK${NC}"
                                cp platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk ./medical-pump-calculator-release.apk
                            fi
                        else
                            echo -e "${YELLOW}未找到zipalign工具，跳过APK优化${NC}"
                            cp platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk ./medical-pump-calculator-release.apk
                        fi
                    else
                        echo -e "${RED}APK签名失败!${NC}"
                        echo -e "${YELLOW}请检查签名配置是否正确${NC}"
                    fi
                else
                    echo -e "${YELLOW}未找到keytool或jarsigner工具，跳过APK签名${NC}"
                fi
            else
                echo -e "${YELLOW}签名配置不完整，跳过APK签名${NC}"
            fi
        else
            echo -e "${YELLOW}未找到keytool或jarsigner工具，跳过APK签名${NC}"
        fi
    else
        echo -e "${RED}错误: Release APK 构建失败!${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}构建完成!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}安装说明:${NC}"
echo -e "1. 在Android设备上，打开设置 > 安全 > 允许安装来自未知来源的应用"
echo -e "2. 将APK文件复制到您的Android设备"
echo -e "3. 使用文件管理器找到并点击APK文件进行安装"
echo -e "4. 安装完成后，您可以在应用列表中找到\"医学微量泵计算工具\""
echo -e "${BLUE}========================================${NC}"