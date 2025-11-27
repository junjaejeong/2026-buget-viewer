// 차트 인스턴스 저장
let accountChart = null;
let monthlyChart = null;
let trendChart = null;

// 다크 테마 색상 정의
const chartColors = {
    gold: 'rgba(212, 175, 55, 1)',
    goldAlpha: 'rgba(212, 175, 55, 0.6)',
    silver: 'rgba(192, 192, 192, 1)',
    silverAlpha: 'rgba(192, 192, 192, 0.6)',
    red: 'rgba(239, 68, 68, 1)',
    redAlpha: 'rgba(239, 68, 68, 0.6)',
    green: 'rgba(52, 211, 153, 1)',
    greenAlpha: 'rgba(52, 211, 153, 0.6)',
    blue: 'rgba(96, 165, 250, 1)',
    blueAlpha: 'rgba(96, 165, 250, 0.6)',
    purple: 'rgba(168, 85, 247, 1)',
    purpleAlpha: 'rgba(168, 85, 247, 0.6)',
    textColor: '#a0aec0',
    gridColor: 'rgba(55, 65, 81, 0.3)'
};

// 차트 기본 옵션
const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
            labels: {
                color: chartColors.textColor,
                font: {
                    size: 12,
                    family: 'SUIT Variable'
                },
                padding: 15,
                usePointStyle: true
            }
        }
    },
    scales: {
        x: {
            ticks: {
                color: chartColors.textColor,
                font: {
                    family: 'SUIT Variable'
                }
            },
            grid: {
                color: chartColors.gridColor,
                display: false
            }
        },
        y: {
            ticks: {
                color: chartColors.textColor,
                font: {
                    family: 'SUIT Variable'
                }
            },
            grid: {
                color: chartColors.gridColor
            }
        }
    }
};

// 차트 초기화
function initializeCharts() {
    createAccountChart();
    createMonthlyChart();
}

// 계정별 예산 집행 현황 차트
function createAccountChart() {
    const ctx = document.getElementById('accountChart');
    if (!ctx) return;
    
    const accounts = ['자체교육', '위탁교육', '컨소시엄'];
    const budgets = [];
    const expenditures = [];
    const balances = [];
    
    accounts.forEach(accountName => {
        const account = state.budgetAccounts.find(acc => acc.account_name === accountName);
        if (account) {
            const budget = account.annual_budget;
            const expenditure = calculateTotalExpenditure(accountName);
            const balance = budget - expenditure;
            
            budgets.push(budget);
            expenditures.push(expenditure);
            balances.push(balance);
        }
    });
    
    if (accountChart) {
        accountChart.destroy();
    }
    
    accountChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: accounts,
            datasets: [
                {
                    label: '예산',
                    data: budgets,
                    backgroundColor: chartColors.goldAlpha,
                    borderColor: chartColors.gold,
                    borderWidth: 2
                },
                {
                    label: '집행액',
                    data: expenditures,
                    backgroundColor: chartColors.redAlpha,
                    borderColor: chartColors.red,
                    borderWidth: 2
                },
                {
                    label: '잔액',
                    data: balances,
                    backgroundColor: chartColors.greenAlpha,
                    borderColor: chartColors.green,
                    borderWidth: 2
                }
            ]
        },
        options: {
            ...chartDefaults,
            plugins: {
                ...chartDefaults.plugins,
                tooltip: {
                    backgroundColor: 'rgba(35, 45, 63, 0.95)',
                    titleColor: chartColors.gold,
                    bodyColor: '#ffffff',
                    borderColor: chartColors.gold,
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += new Intl.NumberFormat('ko-KR', {
                                style: 'currency',
                                currency: 'KRW'
                            }).format(context.parsed.y);
                            return label;
                        }
                    }
                }
            },
            scales: {
                ...chartDefaults.scales,
                y: {
                    ...chartDefaults.scales.y,
                    beginAtZero: true,
                    ticks: {
                        ...chartDefaults.scales.y.ticks,
                        callback: function(value) {
                            return new Intl.NumberFormat('ko-KR', {
                                notation: 'compact',
                                compactDisplay: 'short'
                            }).format(value) + '원';
                        }
                    }
                }
            }
        }
    });
}

// 월별 예산 집행 추이 차트
function createMonthlyChart() {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;
    
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const accounts = ['자체교육', '위탁교육', '컨소시엄'];
    
    const datasets = accounts.map((accountName, index) => {
        const colors = [
            { bg: chartColors.goldAlpha, border: chartColors.gold },
            { bg: chartColors.greenAlpha, border: chartColors.green },
            { bg: chartColors.purpleAlpha, border: chartColors.purple }
        ];
        
        const data = [];
        for (let month = 1; month <= 12; month++) {
            const expenditure = calculateMonthlyExpenditure(accountName, month);
            data.push(expenditure);
        }
        
        return {
            label: accountName,
            data: data,
            backgroundColor: colors[index].bg,
            borderColor: colors[index].border,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: colors[index].border,
            pointBorderColor: '#1a2332',
            pointBorderWidth: 2
        };
    });
    
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: datasets
        },
        options: {
            ...chartDefaults,
            plugins: {
                ...chartDefaults.plugins,
                tooltip: {
                    backgroundColor: 'rgba(35, 45, 63, 0.95)',
                    titleColor: chartColors.gold,
                    bodyColor: '#ffffff',
                    borderColor: chartColors.gold,
                    borderWidth: 1,
                    padding: 12,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += new Intl.NumberFormat('ko-KR', {
                                style: 'currency',
                                currency: 'KRW'
                            }).format(context.parsed.y);
                            return label;
                        }
                    }
                }
            },
            scales: {
                ...chartDefaults.scales,
                y: {
                    ...chartDefaults.scales.y,
                    beginAtZero: true,
                    ticks: {
                        ...chartDefaults.scales.y.ticks,
                        callback: function(value) {
                            return new Intl.NumberFormat('ko-KR', {
                                notation: 'compact',
                                compactDisplay: 'short'
                            }).format(value) + '원';
                        }
                    }
                }
            }
        }
    });
}

// 트렌드 분석 차트
function createTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const accounts = ['자체교육', '위탁교육', '컨소시엄'];
    
    // 실제 집행 데이터
    const actualDatasets = accounts.map((accountName, index) => {
        const colors = [
            { bg: chartColors.goldAlpha, border: chartColors.gold },
            { bg: chartColors.greenAlpha, border: chartColors.green },
            { bg: chartColors.purpleAlpha, border: chartColors.purple }
        ];
        
        const data = [];
        let cumulative = 0;
        for (let month = 1; month <= 12; month++) {
            const expenditure = calculateMonthlyExpenditure(accountName, month);
            cumulative += expenditure;
            data.push(cumulative);
        }
        
        return {
            label: `${accountName} (실제)`,
            data: data,
            backgroundColor: colors[index].bg,
            borderColor: colors[index].border,
            borderWidth: 3,
            fill: false,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6
        };
    });
    
    // 예측 데이터 (평균 기반)
    const predictedDatasets = accounts.map((accountName, index) => {
        const colors = [
            { bg: 'rgba(212, 175, 55, 0.2)', border: 'rgba(212, 175, 55, 0.5)' },
            { bg: 'rgba(52, 211, 153, 0.2)', border: 'rgba(52, 211, 153, 0.5)' },
            { bg: 'rgba(168, 85, 247, 0.2)', border: 'rgba(168, 85, 247, 0.5)' }
        ];
        
        const account = state.budgetAccounts.find(acc => acc.account_name === accountName);
        if (!account) return null;
        
        const monthlyAverage = account.annual_budget / 12;
        const data = [];
        
        for (let month = 1; month <= 12; month++) {
            data.push(monthlyAverage * month);
        }
        
        return {
            label: `${accountName} (예측)`,
            data: data,
            backgroundColor: colors[index].bg,
            borderColor: colors[index].border,
            borderWidth: 2,
            borderDash: [8, 4],
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4
        };
    }).filter(d => d !== null);
    
    if (trendChart) {
        trendChart.destroy();
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [...actualDatasets, ...predictedDatasets]
        },
        options: {
            ...chartDefaults,
            plugins: {
                ...chartDefaults.plugins,
                legend: {
                    ...chartDefaults.plugins.legend,
                    labels: {
                        ...chartDefaults.plugins.legend.labels,
                        font: {
                            size: 11,
                            family: 'SUIT Variable'
                        },
                        boxWidth: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(35, 45, 63, 0.95)',
                    titleColor: chartColors.gold,
                    bodyColor: '#ffffff',
                    borderColor: chartColors.gold,
                    borderWidth: 1,
                    padding: 12,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += new Intl.NumberFormat('ko-KR', {
                                style: 'currency',
                                currency: 'KRW'
                            }).format(context.parsed.y);
                            return label;
                        }
                    }
                }
            },
            scales: {
                ...chartDefaults.scales,
                y: {
                    ...chartDefaults.scales.y,
                    beginAtZero: true,
                    ticks: {
                        ...chartDefaults.scales.y.ticks,
                        callback: function(value) {
                            return new Intl.NumberFormat('ko-KR', {
                                notation: 'compact',
                                compactDisplay: 'short'
                            }).format(value) + '원';
                        }
                    }
                }
            }
        }
    });
}

// 차트 업데이트
function updateCharts() {
    createAccountChart();
    createMonthlyChart();
    if (document.getElementById('tab-analysis')?.classList.contains('active')) {
        createTrendChart();
    }
}

// 분석 탭 렌더링
function renderAnalysis() {
    renderPredictionCards();
    renderStatistics();
    createTrendChart();
}

// 예산 소진 예측 카드
function renderPredictionCards() {
    const container = document.getElementById('predictionCards');
    if (!container) return;
    
    container.innerHTML = '';
    
    const accounts = ['자체교육', '위탁교육', '컨소시엄'];
    const currentMonth = new Date().getMonth() + 1;
    
    accounts.forEach(accountName => {
        const account = state.budgetAccounts.find(acc => acc.account_name === accountName);
        if (!account) return;
        
        const budget = account.annual_budget;
        const expenditure = calculateTotalExpenditure(accountName);
        const balance = budget - expenditure;
        
        // 월평균 집행액 계산
        let totalMonthlyExp = 0;
        let monthsWithExp = 0;
        for (let month = 1; month <= currentMonth; month++) {
            const monthExp = calculateMonthlyExpenditure(accountName, month);
            if (monthExp > 0) {
                totalMonthlyExp += monthExp;
                monthsWithExp++;
            }
        }
        
        const avgMonthlyExp = monthsWithExp > 0 ? totalMonthlyExp / monthsWithExp : 0;
        const remainingMonths = 12 - currentMonth;
        const predictedExpenditure = avgMonthlyExp * remainingMonths;
        const predictedBalance = balance - predictedExpenditure;
        
        // 예상 소진 월 계산
        let exhaustionMonth = '소진 예상 없음';
        let exhaustionColor = 'color: var(--accent-gold);';
        
        if (avgMonthlyExp > 0 && balance > 0) {
            const monthsToExhaustion = Math.floor(balance / avgMonthlyExp);
            if (monthsToExhaustion <= 12 - currentMonth) {
                const exhaustMonth = currentMonth + monthsToExhaustion;
                if (exhaustMonth <= 12) {
                    exhaustionMonth = `${exhaustMonth}월 예상`;
                    exhaustionColor = exhaustMonth <= currentMonth + 2 ? 'color: #ef4444;' : 'color: #fbbf24;';
                }
            }
        }
        
        const card = document.createElement('div');
        card.className = 'luxury-card rounded-xl p-8';
        card.innerHTML = `
            <h4 class="text-xl font-semibold mb-6">${accountName}</h4>
            <div class="space-y-4">
                <div class="flex justify-between text-sm">
                    <span style="color: var(--text-secondary);">현재 잔액</span>
                    <span class="font-semibold">${formatCurrency(balance)}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span style="color: var(--text-secondary);">월평균 집행</span>
                    <span class="font-semibold">${formatCurrency(avgMonthlyExp)}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span style="color: var(--text-secondary);">예상 연말 잔액</span>
                    <span class="font-semibold ${predictedBalance < 0 ? 'text-red-400' : 'text-green-400'}">
                        ${formatCurrency(predictedBalance)}
                    </span>
                </div>
                <div class="pt-4 border-t" style="border-color: var(--border-subtle);">
                    <div class="flex justify-between text-sm">
                        <span style="color: var(--text-secondary);">예산 소진 예상</span>
                        <span class="font-bold" style="${exhaustionColor}">${exhaustionMonth}</span>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// 통계 요약
function renderStatistics() {
    const container = document.getElementById('statisticsCards');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 최대 집행 계정
    const accounts = ['자체교육', '위탁교육', '컨소시엄'];
    let maxAccount = '';
    let maxRate = 0;
    
    accounts.forEach(accountName => {
        const account = state.budgetAccounts.find(acc => acc.account_name === accountName);
        if (!account) return;
        
        const budget = account.annual_budget;
        const expenditure = calculateTotalExpenditure(accountName);
        const rate = budget > 0 ? (expenditure / budget * 100) : 0;
        
        if (rate > maxRate) {
            maxRate = rate;
            maxAccount = accountName;
        }
    });
    
    // 최대 단일 집행
    let maxExpenditure = 0;
    let maxExpAccount = '';
    let maxExpDescription = '';
    
    state.expenditures.forEach(exp => {
        if (exp.amount > maxExpenditure && exp.amount > 0) {
            maxExpenditure = exp.amount;
            maxExpAccount = exp.account_name;
            maxExpDescription = exp.description;
        }
    });
    
    // 총 집행 건수
    const totalExpenditureCount = state.expenditures.filter(exp => exp.amount > 0).length;
    
    // 총 예산 이동 건수
    const totalTransferCount = state.transfers.length;
    
    const stats = [
        {
            title: '집행률 최고 계정',
            value: maxAccount,
            subtitle: `집행률: ${maxRate.toFixed(1)}%`,
            icon: 'fa-trophy',
            color: 'var(--accent-gold)'
        },
        {
            title: '최대 단일 집행',
            value: formatCurrency(maxExpenditure),
            subtitle: `${maxExpAccount} - ${maxExpDescription.substring(0, 20)}...`,
            icon: 'fa-arrow-up',
            color: '#ef4444'
        },
        {
            title: '총 집행 건수',
            value: `${totalExpenditureCount}건`,
            subtitle: `평균 집행액: ${formatCurrency((calculateTotalExpenditure('자체교육') + calculateTotalExpenditure('위탁교육') + calculateTotalExpenditure('컨소시엄')) / (totalExpenditureCount || 1))}`,
            icon: 'fa-list-ol',
            color: chartColors.blue
        },
        {
            title: '예산 이동 건수',
            value: `${totalTransferCount}건`,
            subtitle: totalTransferCount > 0 ? '예산 조정이 활발합니다' : '예산 이동 없음',
            icon: 'fa-exchange-alt',
            color: chartColors.purple
        }
    ];
    
    stats.forEach(stat => {
        const card = document.createElement('div');
        card.className = 'luxury-card rounded-xl p-8';
        card.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h4 class="text-sm font-medium" style="color: var(--text-secondary);">${stat.title}</h4>
                <i class="fas ${stat.icon} text-3xl" style="color: ${stat.color};"></i>
            </div>
            <div class="mb-2">
                <span class="text-3xl font-bold">${stat.value}</span>
            </div>
            <p class="text-xs" style="color: var(--text-secondary);">${stat.subtitle}</p>
        `;
        
        container.appendChild(card);
    });
}
