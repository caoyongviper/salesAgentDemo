# 读取Excel文件并转换为JSON
$excelPath = ".\ISG历史下发标讯260324-simple.xlsx"
$jsonPath = ".\ISG历史下发标讯260324-simple.json"

# 加载Excel COM对象
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    $workbook = $excel.Workbooks.Open($excelPath)
    $worksheet = $workbook.Sheets.Item(1)
    
    # 获取数据范围
    $usedRange = $worksheet.UsedRange
    $rows = $usedRange.Rows.Count
    $columns = $usedRange.Columns.Count
    
    # 获取表头
    $headers = @()
    for ($col = 1; $col -le $columns; $col++) {
        $headers += $usedRange.Cells.Item(1, $col).Value2
    }
    
    # 读取数据
    $data = @()
    for ($row = 2; $row -le $rows; $row++) {
        $rowData = @{}
        for ($col = 1; $col -le $columns; $col++) {
            $header = $headers[$col-1]
            $value = $usedRange.Cells.Item($row, $col).Value2
            $rowData[$header] = $value
        }
        $data += $rowData
    }
    
    # 转换为JSON并保存
    $json = $data | ConvertTo-Json -Depth 10
    $json | Out-File -FilePath $jsonPath -Encoding UTF8
    
    Write-Host "Excel文件已成功转换为JSON文件: $jsonPath"
    
} catch {
    Write-Host "转换失败: $($_.Exception.Message)"
} finally {
    # 清理资源
    if ($workbook) {
        $workbook.Close($false)
    }
    if ($excel) {
        $excel.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}