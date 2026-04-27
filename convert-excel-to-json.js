const fs = require('fs');
const XLSX = require('xlsx');

// Excel文件路径
const excelFilePath = './ISG历史下发标讯260324-simple.xlsx';
const jsonFilePath = './ISG历史下发标讯260324-simple.json';

try {
  // 读取Excel文件
  console.log('正在读取Excel文件...');
  const workbook = XLSX.readFile(excelFilePath);
  
  // 获取第一个工作表
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // 转换为JSON
  console.log('正在转换为JSON...');
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  // 写入JSON文件
  fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf8');
  
  console.log(`\n✅ 转换成功！`);
  console.log(`📁 输入文件: ${excelFilePath}`);
  console.log(`📁 输出文件: ${jsonFilePath}`);
  console.log(`📊 数据行数: ${jsonData.length}`);
  
  // 显示前几条数据
  console.log('\n📋 前3条数据预览:');
  const previewData = jsonData.slice(0, 3);
  previewData.forEach((item, index) => {
    console.log(`\n第${index + 1}条:`);
    Object.entries(item).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  });
  
} catch (error) {
  console.error('❌ 转换失败:', error.message);
  console.error('错误详情:', error);
}
