// 전역 상태 관리
const state = {
    budgetAccounts: [],
    monthlyAllocations: [],
    expenditures: [],
    transfers: [],
    // ⭐ 1. budgetAdjustments 필드 추가
    budgetAdjustments: [], 
    alerts: [],
    currentMonth: new Date().getMonth() + 1
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

// 앱 초기화
async function initializeApp() {
    try {
        showLoading();
        await loadAllData();
        renderDashboard();
        renderMonthlyTable();
        initializeCharts();
        checkBudgetAlerts();
        hideLoading();
    } catch (error) {
        console.error('앱 초기화 오류:', error);
        showAlert('데이터 로드 중 오류가 발생했습니다', 'error');
        hideLoading();
    }
}

// 모든 데이터 로드 (CSV 파일 로드 기반으로 수정)
async function loadAllData() {
    try {
        // --- 1. 초기 예산 계정 데이터 로드 ---
        const accountsResponse = await fetch('1_budget_accounts.csv');
        const accountsText = await accountsResponse.text();
        state.budgetAccounts = parseCSV(accountsText);
        
        // --- 2. 월별 배정 데이터 로드 ---
        const allocationsResponse = await fetch('2_monthly_allocations.csv');
        const allocationsText = await allocationsResponse.text();
        state.monthlyAllocations = parseCSV(allocationsText);

        // --- 3. 집행 내역 데이터 로드 ---
        const expendituresResponse = await fetch('expenditures.csv');
        const expendituresText = await expendituresResponse.text();
        state.expenditures = parseCSV(expendituresText); 
        
        // --- 4. 예산 이동 내역 데이터 로드 ---
        const transfersResponse = await fetch('transfers.csv');
        const transfersText = await transfersResponse.text();
        // parseCSV로 로드
        state.transfers = parseCSV(transfersText); 

        // ⭐ 2. 연간 예산 변경 내역 데이터 로드 (추가)
        const adjustmentsResponse = await fetch('3_budget_adjustments.csv');
        const adjustmentsText = await adjustmentsResponse.text();
        state.budgetAdjustments = parseCSV(adjustmentsText); 
        // ⭐
        
        // --- 5. 동적 데이터(알림)는 빈 배열로 초기화 ---
        state.alerts = [];
        
        console.log('데이터 로드 완료 (CSV 기반):', state);
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        showAlert('CSV 파일 로드 중 오류가 발생했습니다. 파일이 루트 폴더에 있는지 확인해 주세요.', 'error');
        throw error;
    }
}
// 대시보드 렌더링
function renderDashboard() {
    const accounts = ['자체교육', '위탁교육', '컨소시엄'];
    let totalBudget = 0;
    let totalExpenditure = 0;
    
    accounts.forEach(accountName => {
        const account = state.budgetAccounts.find(acc => acc.account_name === accountName);
        if (!account) return;
        
        // ⭐ 3. 최종 연간 예산 계산 함수 사용
        const budget = calculateFinalAnnualBudget(accountName); 
        // ⭐
        
        const expenditure = calculateTotalExpenditure(accountName);
        const balance = budget - expenditure;
        const rate = budget > 0 ? (expenditure / budget * 100).toFixed(1) : 0;
        
        totalBudget += budget;
        totalExpenditure += expenditure;
        
        // 계정별 카드 업데이트
        document.getElementById(`budget-${accountName}`).textContent = formatCurrency(budget);
        document.getElementById(`expenditure-${accountName}`).textContent = formatCurrency(expenditure);
        document.getElementById(`balance-${accountName}`).textContent = formatCurrency(balance);
        document.getElementById(`progress-${accountName}`).style.width = `${rate}%`;
        document.getElementById(`rate-${accountName}`).textContent = `${rate}%`;
        
        // 진행률에 따른 색상 변경
        const progressBar = document.getElementById(`progress-${accountName}`);
        if (rate >= 100) {
            progressBar.classList.remove('bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-yellow-500');
            progressBar.classList.add('bg-red-600');
        } else if (rate >= 90) {
            progressBar.classList.remove('bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-red-600');
            progressBar.classList.add('bg-yellow-500');
        }
    });
    
    const totalBalance = totalBudget - totalExpenditure;
    const totalRate = totalBudget > 0 ? (totalExpenditure / totalBudget * 100).toFixed(1) : 0;
    
    // 전체 요약 카드 업데이트
    document.getElementById('totalBudget').textContent = formatCurrency(totalBudget);
    document.getElementById('totalExpenditure').textContent = formatCurrency(totalExpenditure);
    document.getElementById('totalBalance').textContent = formatCurrency(totalBalance);
    document.getElementById('executionRate').textContent = `${totalRate}%`;
}

// 특정 계정의 총 집행액 계산
function calculateTotalExpenditure(accountName) {
    return state.expenditures
        .filter(exp => exp.account_name === accountName)
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);
}

// 특정 계정의 월별 집행액 계산
function calculateMonthlyExpenditure(accountName, month) {
    return state.expenditures
        .filter(exp => exp.account_name === accountName && exp.month === month)
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);
}

// ⭐ 4. 최종 예산 계산 유틸리티 함수 추가

/**
 * 최종 연간 예산을 계산합니다. (초기 예산 + 모든 조정 내역)
 * @param {string} accountName - 계정명
 * @returns {number} 최종 연간 예산
 */
function calculateFinalAnnualBudget(accountName) {
    // 1. 초기 연간 예산 로드
    const initialAccount = state.budgetAccounts.find(acc => acc.account_name === accountName);
    let finalBudget = initialAccount ? initialAccount.annual_budget : 0; 

    // 2. 예산 조정 내역 반영
    if (state.budgetAdjustments) {
        state.budgetAdjustments
            .filter(adj => adj.account_name === accountName)
            .forEach(adj => {
                const amount = adj.amount || 0;
                if (adj.type === '증액' || adj.type === 'Increase') {
                    finalBudget += amount;
                } else if (adj.type === '감액' || adj.type === 'Decrease') {
                    finalBudget -= amount;
                }
            });
    }

    return finalBudget;
}

/**
 * 조정된 최종 월별 배정 예산을 계산합니다.
 * @param {string} accountName - 계정명
 * @param {number} month - 월
 * @returns {number} 최종 월별 배정 예산
 */
function getAdjustedMonthlyAllocation(accountName, month) {
    // 1. 초기 월별 배정 예산 로드
    const initialAllocation = state.monthlyAllocations.find(
        alloc => alloc.account_name === accountName && alloc.month === month
    );
    let finalMonthlyBudget = initialAllocation ? initialAllocation.monthly_budget : 0;

    // 2. 해당 월의 예산 조정 내역 반영
    if (state.budgetAdjustments) {
        state.budgetAdjustments
            .filter(adj => adj.account_name === accountName && adj.month === month)
            .forEach(adj => {
                const amount = adj.amount || 0;
                if (adj.type === '증액' || adj.type === 'Increase') {
                    finalMonthlyBudget += amount;
                } else if (adj.type === '감액' || adj.type === 'Decrease') {
                    finalMonthlyBudget -= amount;
                }
            });
    }
    
    return finalMonthlyBudget;
}
// ⭐ 
// 월별 현황 테이블 렌더링
function renderMonthlyTable() {
    const tbody = document.getElementById('monthlyTableBody');
    tbody.innerHTML = '';
    
    for (let month = 1; month <= 12; month++) {
        const row = document.createElement('tr');
        
        // 각 계정별 배정 및 집행
        // ⚠️ 수정: getMonthlyAllocation 대신 getAdjustedMonthlyAllocation 사용
        const 자체배정 = getAdjustedMonthlyAllocation('자체교육', month);
        // ⚠️
        const 자체집행 = calculateMonthlyExpenditure('자체교육', month);
        // ⚠️ 수정
        const 위탁배정 = getAdjustedMonthlyAllocation('위탁교육', month);
        // ⚠️
        const 위탁집행 = calculateMonthlyExpenditure('위탁교육', month);
        // ⚠️ 수정
        const 컨소시엄배정 = getAdjustedMonthlyAllocation('컨소시엄', month);
        // ⚠️
        const 컨소시엄집행 = calculateMonthlyExpenditure('컨소시엄', month);
        
        const 총배정 = 자체배정 + 위탁배정 + 컨소시엄배정;
        const 총집행 = 자체집행 + 위탁집행 + 컨소시엄집행;
        
        row.innerHTML = `
            <td class="font-semibold">${month}월</td>
            <td>${formatCurrency(자체배정)}</td>
            <td class="text-red-400">${formatCurrency(자체집행)}</td>
            <td>${formatCurrency(위탁배정)}</td>
            <td class="text-red-400">${formatCurrency(위탁집행)}</td>
            <td>${formatCurrency(컨소시엄배정)}</td>
            <td class="text-red-400">${formatCurrency(컨소시엄집행)}</td>
            <td class="font-semibold" style="background: rgba(212, 175, 55, 0.1); color: var(--accent-gold);">${formatCurrency(총배정)}</td>
            <td class="font-semibold" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">${formatCurrency(총집행)}</td>
        `;
        
        tbody.appendChild(row);
    }
}

// 월별 배정 예산 조회 (기존 함수는 유지, 위에서 새로 만든 함수를 사용)
function getMonthlyAllocation(accountName, month) {
    const allocation = state.monthlyAllocations.find(
        alloc => alloc.account_name === accountName && alloc.month === month
    );
    return allocation ? allocation.monthly_budget : 0; // 'allocated_budget' -> 'monthly_budget' (CSV 필드명에 맞게)
}

// 예산 알림 체크
function checkBudgetAlerts() {
    const accounts = ['자체교육', '위탁교육', '컨소시엄'];
    
    accounts.forEach(accountName => {
        const account = state.budgetAccounts.find(acc => acc.account_name === accountName);
        if (!account) return;
        
        // ⭐ 5. 최종 연간 예산 계산 함수 사용
        const budget = calculateFinalAnnualBudget(accountName); 
        // ⭐
        const expenditure = calculateTotalExpenditure(accountName);
        const rate = budget > 0 ? (expenditure / budget * 100) : 0;
        
        // 100% 초과 알림
        if (rate >= 100) {
            const existingAlert = state.alerts.find(
                alert => alert.account_name === accountName && 
                        alert.alert_type === '100%초과' && 
                        alert.month === state.currentMonth
            );
            
            if (!existingAlert) {
                createAlert(accountName, '100%초과', `${accountName} 예산이 100%를 초과했습니다! 긴급 조치가 필요합니다.`);
            }
        }
        // 90% 도달 알림
        else if (rate >= 90) {
            const existingAlert = state.alerts.find(
                alert => alert.account_name === accountName && 
                        alert.alert_type === '90%도달' && 
                        alert.month === state.currentMonth
            );
            
            if (!existingAlert) {
                createAlert(accountName, '90%도달', `${accountName} 예산이 90%에 도달했습니다. 주의가 필요합니다.`);
            }
        }
    });
    
    // 알림 히스토리 렌더링
    renderAlertHistory();
}

// 알림 생성 및 저장 (수정됨: 뷰어 모드)
async function createAlert(accountName, alertType, message) {
    const alertData = {
        id: generateId(),
        account_name: accountName,
        month: state.currentMonth,
        alert_type: alertType,
        message: message,
        alert_datetime: new Date().toISOString(),
        is_read: false
    };
    
    // ⚠️ 뷰어 모드: API 호출 제거. 로컬 상태에만 추가
    state.alerts.push(alertData); 
    showAlertPopup(message, alertType);
    
    // 기존 try...catch 블록 (API 요청) 제거
}

// 알림 팝업 표시
function showAlertPopup(message, type) {
    const container = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    
    const bgColor = type === '100%초과' ? 'bg-red-600' : 'bg-yellow-500';
    const icon = type === '100%초과' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle';
    
    alertDiv.className = `alert-popup ${bgColor} text-white p-4 rounded-lg shadow-lg`;
    alertDiv.innerHTML = `
        <div class="flex items-start">
            <i class="fas ${icon} text-2xl mr-3 mt-1"></i>
            <div class="flex-1">
                <p class="font-semibold mb-1">${type === '100%초과' ? '예산 초과 경고!' : '예산 사용률 주의'}</p>
                <p class="text-sm">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-3 hover:opacity-75">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(alertDiv);
    
    // 5초 후 자동 제거
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// 알림 히스토리 렌더링
function renderAlertHistory() {
    const container = document.getElementById('alertHistoryList');
    const emptyDiv = document.getElementById('alertsEmpty');
    
    if (state.alerts.length === 0) {
        container.style.display = 'none';
        emptyDiv.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    emptyDiv.style.display = 'none';
    container.innerHTML = '';
    
    // 최신순 정렬
    const sortedAlerts = [...state.alerts].sort((a, b) => 
        new Date(b.alert_datetime) - new Date(a.alert_datetime)
    );
    
    sortedAlerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        const isDanger = alert.alert_type === '100%초과';
        const borderColor = isDanger ? '#ef4444' : '#fbbf24';
        const iconColor = isDanger ? '#ef4444' : '#fbbf24';
        const icon = isDanger ? 'fa-exclamation-triangle' : 'fa-exclamation-circle';
        
        alertDiv.className = 'luxury-card p-6 rounded-xl';
        alertDiv.style.borderLeft = `4px solid ${borderColor}`;
        alertDiv.innerHTML = `
            <div class="flex items-start">
                <i class="fas ${icon} text-2xl mr-4 mt-1" style="color: ${iconColor};"></i>
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-3">
                        <span class="font-semibold text-lg">${alert.account_name} - ${alert.alert_type}</span>
                        <span class="text-xs" style="color: var(--text-secondary);">${formatDateTime(alert.alert_datetime)}</span>
                    </div>
                    <p style="color: var(--text-secondary);">${alert.message}</p>
                </div>
            </div>
        `;
        
        container.appendChild(alertDiv);
    });
}

// 집행 내역 폼 제출 (수정됨: 뷰어 모드)
document.getElementById('expenditureForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // ⚠️ 뷰어 모드: 데이터 입력 비활성화 경고
    showAlert('뷰어 모드입니다. 새로운 집행 내역을 등록할 수 없습니다.', 'warning');
    // 기존 API 호출 및 성공 로직 제거
});

// 집행 내역 로드
async function loadExpenditures() {
    const filterAccount = document.getElementById('filterAccount').value;
    const tbody = document.getElementById('expenditureTableBody');
    const emptyDiv = document.getElementById('expenditureEmpty');
    
    let filteredExpenditures = state.expenditures;
    if (filterAccount) {
        filteredExpenditures = filteredExpenditures.filter(exp => exp.account_name === filterAccount);
    }
    
    if (filteredExpenditures.length === 0) {
        tbody.innerHTML = '';
        emptyDiv.style.display = 'block';
        return;
    }
    
    emptyDiv.style.display = 'none';
    tbody.innerHTML = '';
    
    // 최신순 정렬
    const sortedExpenditures = [...filteredExpenditures].sort((a, b) => 
        new Date(b.expenditure_date) - new Date(a.expenditure_date)
    );
    
    sortedExpenditures.slice(0, 50).forEach(exp => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(exp.expenditure_date)}</td>
            <td><span class="badge badge-success">${exp.account_name}</span></td>
            <td class="font-semibold text-red-600">${formatCurrency(exp.amount)}</td>
            <td class="max-w-xs truncate">${exp.description}</td>
            <td>${exp.manager}</td>
            <td>
                <button onclick="editExpenditure('${exp.id}')" class="text-blue-400 hover:text-blue-300 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteExpenditure('${exp.id}')" class="text-red-400 hover:text-red-300">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 집행 내역 삭제 (수정됨: 뷰어 모드)
async function deleteExpenditure(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    // ⚠️ 뷰어 모드: 데이터 삭제 비활성화 경고
    showAlert('뷰어 모드입니다. 집행 내역을 삭제할 수 없습니다.', 'warning');
    // 기존 API 호출 및 성공 로직 제거
}

// 예산 이동 폼 제출 (수정됨: 뷰어 모드)
document.getElementById('transferForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // ⚠️ 뷰어 모드: 예산 이동 비활성화 경고
    showAlert('뷰어 모드입니다. 예산 이동 기능을 사용할 수 없습니다.', 'warning');
    // 기존 API 호출 및 성공 로직 제거
});

// 예산 이동 히스토리 로드
function loadTransferHistory() {
    const container = document.getElementById('transferList');
    const emptyDiv = document.getElementById('transferEmpty');
    
    if (state.transfers.length === 0) {
        container.style.display = 'none';
        emptyDiv.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    emptyDiv.style.display = 'none';
    container.innerHTML = '';
    
    // 최신순 정렬
    const sortedTransfers = [...state.transfers].sort((a, b) => 
        new Date(b.transfer_date) - new Date(a.transfer_date)
    );
    
    sortedTransfers.forEach(transfer => {
        const transferDiv = document.createElement('div');
        transferDiv.className = 'luxury-card p-6 rounded-xl';
        transferDiv.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="badge badge-warning">${transfer.from_account} (${transfer.from_month}월)</span>
                    <i class="fas fa-arrow-right" style="color: var(--accent-gold);"></i>
                    <span class="badge badge-success">${transfer.to_account} (${transfer.to_month}월)</span>
                </div>
                <span class="text-sm" style="color: var(--text-secondary);">${formatDateTime(transfer.transfer_date)}</span>
            </div>
            <div class="mb-3">
                <span class="text-2xl font-bold" style="color: var(--accent-gold);">${formatCurrency(transfer.amount)}</span>
            </div>
            <p class="text-sm mb-4" style="color: var(--text-secondary);">${transfer.reason}</p>
            <div class="grid grid-cols-2 gap-3 text-xs">
                <div style="background: rgba(255, 255, 255, 0.03); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
                    <div style="color: var(--text-secondary);" class="mb-1">${transfer.from_account} 이동 전</div>
                    <div class="font-semibold">${formatCurrency(transfer.from_balance_before)}</div>
                    <div style="color: var(--text-secondary);" class="mt-2 mb-1">${transfer.from_account} 이동 후</div>
                    <div class="font-semibold">${formatCurrency(transfer.from_balance_after)}</div>
                </div>
                <div style="background: rgba(255, 255, 255, 0.03); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
                    <div style="color: var(--text-secondary);" class="mb-1">${transfer.to_account} 이동 전</div>
                    <div class="font-semibold">${formatCurrency(transfer.to_balance_before)}</div>
                    <div style="color: var(--text-secondary);" class="mt-2 mb-1">${transfer.to_account} 이동 후</div>
                    <div class="font-semibold">${formatCurrency(transfer.to_balance_after)}</div>
                </div>
            </div>
        `;
        container.appendChild(transferDiv);
    });
}

// 탭 전환
function switchTab(tabName) {
    // 모든 탭 비활성화
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 선택된 탭 활성화
    event.target.closest('.nav-tab').classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // 탭별 데이터 로드
    if (tabName === 'expenditure') {
        loadExpenditures();
    } else if (tabName === 'transfer') {
        loadTransferHistory();
    } else if (tabName === 'alerts') {
        renderAlertHistory();
    } else if (tabName === 'analysis') {
        renderAnalysis();
    }
}

// 데이터 새로고침
async function refreshData() {
    await initializeApp();
    showAlert('데이터가 새로고침되었습니다', 'success');
}

// 모달 제어
function showExportModal() {
    document.getElementById('exportModal').classList.add('active');
}

function closeExportModal() {
    document.getElementById('exportModal').classList.remove('active');
}

// 유틸리티 함수
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
}

function showAlert(message, type = 'info') {
    const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600',
        warning: 'bg-yellow-600'
    };
    
    const container = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-popup ${colors[type]} text-white p-4 rounded-lg shadow-lg`;
    alertDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-info-circle mr-3"></i>
            <p>${message}</p>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-auto hover:opacity-75">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}
// ⚠️ CSV 텍스트를 파싱하여 객체 배열로 반환하는 함수 (유틸리티 섹션에 추가)
function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];
    
    // 첫 번째 줄을 헤더(키)로 사용
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '')); 
    
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length !== headers.length) continue; 
        
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            // 따옴표 제거, 숫자는 parseInt로 변환 시도
            let value = values[j].trim().replace(/"/g, '');
            if (!isNaN(value) && value !== '') {
                // 숫자인 경우 정수로 변환 (금액 데이터 때문)
                obj[headers[j]] = parseInt(value); 
            } else {
                obj[headers[j]] = value;
            }
        }
        result.push(obj);
    }
    return result;
}
function showLoading() {
    // 간단한 로딩 표시 (필요시 구현)
}

function hideLoading() {
    // 로딩 숨김 (필요시 구현)
}

// 집행 내역 수정 모달 열기
function editExpenditure(id) {
    const expenditure = state.expenditures.find(exp => exp.id === id);
    if (!expenditure) return;
    
    document.getElementById('editExpId').value = expenditure.id;
    document.getElementById('editExpAccount').value = expenditure.account_name;
    document.getElementById('editExpDate').value = expenditure.expenditure_date.split('T')[0];
    document.getElementById('editExpAmount').value = expenditure.amount;
    document.getElementById('editExpDescription').value = expenditure.description;
    document.getElementById('editExpManager').value = expenditure.manager;
    document.getElementById('editExpIssue').value = expenditure.issue || '';
    
    document.getElementById('editExpenditureModal').classList.add('active');
}

// 수정 모달 닫기
function closeEditModal() {
    document.getElementById('editExpenditureModal').classList.remove('active');
}

// 집행 내역 수정 폼 제출 (수정됨: 뷰어 모드)
document.getElementById('editExpenditureForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // ⚠️ 뷰어 모드: 데이터 수정 비활성화 경고
    showAlert('뷰어 모드입니다. 집행 내역을 수정할 수 없습니다.', 'warning');
    // 기존 API 호출 및 성공 로직 제거
    
    // 모달 닫기
    closeEditModal(); 
});