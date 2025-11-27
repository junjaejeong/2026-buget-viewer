// CSV 내보내기 함수

function exportData(type) {
    switch(type) {
        case 'expenditures':
            exportExpenditures();
            break;
        case 'transfers':
            exportTransfers();
            break;
        case 'monthly':
            exportMonthlyReport();
            break;
        default:
            showAlert('알 수 없는 내보내기 유형입니다', 'error');
    }
    
    closeExportModal();
}

// 집행 내역 내보내기
function exportExpenditures() {
    if (state.expenditures.length === 0) {
        showAlert('내보낼 집행 내역이 없습니다', 'warning');
        return;
    }
    
    const headers = ['집행일자', '계정', '금액(원)', '내용', '담당자', '이슈사항', '연도', '월'];
    
    const rows = state.expenditures
        .filter(exp => exp.amount > 0) // 양수 금액만 (예산 이동 제외)
        .sort((a, b) => new Date(b.expenditure_date) - new Date(a.expenditure_date))
        .map(exp => [
            formatDateForExport(exp.expenditure_date),
            exp.account_name,
            exp.amount,
            `"${exp.description.replace(/"/g, '""')}"`, // CSV 이스케이프
            exp.manager,
            `"${(exp.issue || '').replace(/"/g, '""')}"`,
            exp.year,
            exp.month
        ]);
    
    const csv = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
    
    // BOM 추가 (엑셀에서 한글 깨짐 방지)
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `예산집행내역_${getDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('집행 내역이 다운로드되었습니다', 'success');
}

// 예산 이동 내역 내보내기
function exportTransfers() {
    if (state.transfers.length === 0) {
        showAlert('내보낼 예산 이동 내역이 없습니다', 'warning');
        return;
    }
    
    const headers = [
        '이동일자',
        '출발계정',
        '도착계정',
        '이동금액(원)',
        '사유',
        '출발계정_이동전잔액',
        '출발계정_이동후잔액',
        '도착계정_이동전잔액',
        '도착계정_이동후잔액'
    ];
    
    const rows = state.transfers
        .sort((a, b) => new Date(b.transfer_date) - new Date(a.transfer_date))
        .map(transfer => [
            formatDateForExport(transfer.transfer_date),
            transfer.from_account,
            transfer.to_account,
            transfer.amount,
            `"${transfer.reason.replace(/"/g, '""')}"`,
            transfer.from_balance_before,
            transfer.from_balance_after,
            transfer.to_balance_before,
            transfer.to_balance_after
        ]);
    
    const csv = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
    
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `예산이동내역_${getDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('예산 이동 내역이 다운로드되었습니다', 'success');
}

// 월별 현황 리포트 내보내기
function exportMonthlyReport() {
    const accounts = ['자체교육', '위탁교육', '컨소시엄'];
    
    const headers = [
        '월',
        '자체교육_배정',
        '자체교육_집행',
        '자체교육_잔액',
        '자체교육_집행률(%)',
        '위탁교육_배정',
        '위탁교육_집행',
        '위탁교육_잔액',
        '위탁교육_집행률(%)',
        '컨소시엄_배정',
        '컨소시엄_집행',
        '컨소시엄_잔액',
        '컨소시엄_집행률(%)',
        '총배정',
        '총집행',
        '총잔액',
        '총집행률(%)'
    ];
    
    const rows = [];
    
    for (let month = 1; month <= 12; month++) {
        const row = [`${month}월`];
        
        let totalAllocation = 0;
        let totalExpenditure = 0;
        
        accounts.forEach(accountName => {
            const allocation = getMonthlyAllocation(accountName, month);
            const expenditure = calculateMonthlyExpenditure(accountName, month);
            const balance = allocation - expenditure;
            const rate = allocation > 0 ? (expenditure / allocation * 100).toFixed(1) : 0;
            
            totalAllocation += allocation;
            totalExpenditure += expenditure;
            
            row.push(allocation, expenditure, balance, rate);
        });
        
        const totalBalance = totalAllocation - totalExpenditure;
        const totalRate = totalAllocation > 0 ? (totalExpenditure / totalAllocation * 100).toFixed(1) : 0;
        
        row.push(totalAllocation, totalExpenditure, totalBalance, totalRate);
        rows.push(row);
    }
    
    // 연간 합계 행 추가
    const yearlyRow = ['연간합계'];
    let yearlyTotalAllocation = 0;
    let yearlyTotalExpenditure = 0;
    
    accounts.forEach(accountName => {
        const account = state.budgetAccounts.find(acc => acc.account_name === accountName);
        const allocation = account ? account.annual_budget : 0;
        const expenditure = calculateTotalExpenditure(accountName);
        const balance = allocation - expenditure;
        const rate = allocation > 0 ? (expenditure / allocation * 100).toFixed(1) : 0;
        
        yearlyTotalAllocation += allocation;
        yearlyTotalExpenditure += expenditure;
        
        yearlyRow.push(allocation, expenditure, balance, rate);
    });
    
    const yearlyBalance = yearlyTotalAllocation - yearlyTotalExpenditure;
    const yearlyRate = yearlyTotalAllocation > 0 ? (yearlyTotalExpenditure / yearlyTotalAllocation * 100).toFixed(1) : 0;
    
    yearlyRow.push(yearlyTotalAllocation, yearlyTotalExpenditure, yearlyBalance, yearlyRate);
    rows.push(yearlyRow);
    
    const csv = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
    
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `월별예산현황_${getDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('월별 현황 리포트가 다운로드되었습니다', 'success');
}

// 날짜 포맷 (내보내기용)
function formatDateForExport(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 파일명용 날짜 문자열
function getDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// 차트를 이미지로 저장 (추가 기능)
function downloadChartAsImage(chartId, filename) {
    const canvas = document.getElementById(chartId);
    if (!canvas) {
        showAlert('차트를 찾을 수 없습니다', 'error');
        return;
    }
    
    canvas.toBlob(function(blob) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${getDateString()}.png`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert('차트 이미지가 다운로드되었습니다', 'success');
    });
}

// JSON 데이터 내보내기 (백업용)
function exportAllDataAsJSON() {
    const data = {
        exportDate: new Date().toISOString(),
        budgetAccounts: state.budgetAccounts,
        monthlyAllocations: state.monthlyAllocations,
        expenditures: state.expenditures,
        transfers: state.transfers,
        alerts: state.alerts
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `예산데이터백업_${getDateString()}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('전체 데이터가 백업되었습니다', 'success');
}
