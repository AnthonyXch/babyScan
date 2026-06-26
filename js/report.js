/**
 * BabyHeadScan - 报告生成模块
 * 动态生成分析报告的HTML内容
 */

class ReportGenerator {
    constructor() {
        this.container = null;
    }

    /**
     * 生成完整报告HTML
     * @param {object} results - HeadShapeAnalyzer的分析结果
     * @param {object} babyInfo - 宝宝信息
     * @param {object} images - { right, left, front, top, back, forehead }
     */
    generate(results, babyInfo, images = {}) {
        const sections = [
            this._generateBabyInfoCard(babyInfo),
            this._generateScoreCard(results),
            this._generateCephalicIndexCard(results),
            this._generateMetricsCard(results),
            this._generateGrowthChartCard(results, babyInfo),
            this._generateAnalysisDetailCard(results),
            this._generateDisclaimer(),
        ];

        return sections.join('');
    }

    /**
     * 渲染到指定容器
     */
    renderTo(containerId, results, babyInfo, images) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('[Report] 容器元素未找到:', containerId);
            return;
        }
        
        const html = this.generate(results, babyInfo, images);
        this.container.innerHTML = html;
        
        // 延迟执行图表动画
        setTimeout(() => {
            this._animateChartBars();
        }, 300);
    }

    /**
     * 宝宝信息卡片
     */
    _generateBabyInfoCard(babyInfo) {
        const name = babyInfo.name || '未命名宝宝';
        const gender = babyInfo.gender || 'girl';
        const genderText = gender === 'boy' ? '男宝宝' : '女宝宝';
        const genderIcon = gender === 'boy' ? '👦' : '👧';
        const ageDays = babyInfo.ageDays !== undefined ? babyInfo.ageDays : '—';
        const prematureText = babyInfo.isPremature ? '是' : '否';
        const hc = babyInfo.headCircumference || '—';
        const hcText = hc !== '—' ? `${hc} cm` : '未填写';
        const hematomaText = babyInfo.hasHematoma ? '有' : '无';
        const calcificationText = babyInfo.hasCalcification ? '有' : '无';
        const fontanelle = babyInfo.fontanelleSize || '—';
        const fontanelleText = fontanelle !== '—' ? `${fontanelle} cm` : '未填写';
        
        return `
        <div class="baby-info-card">
            <div class="baby-avatar">${genderIcon}</div>
            <div class="baby-details">
                <h3>${this._escapeHtml(name)} · ${genderText}</h3>
                <p>日龄：${ageDays} 天 | 早产：${prematureText} | 头围：${hcText}</p>
                <p style="font-size:12px;color:var(--text-light);margin-top:3px;">
                    前囟门：${fontanelleText} | 血肿：${hematomaText} | 钙化：${calcificationText}
                </p>
                <p style="font-size:11px;color:#B2BEC3;margin-top:2px;">
                    报告时间：${this._formatDate(new Date())}
                </p>
            </div>
        </div>`;
    }

    /**
     * 综合评分卡
     */
    _generateScoreCard(results) {
        const score = results.overallScore;
        let scoreClass = 'good';
        let scoreText = '头型状态良好';
        
        if (score < 60) {
            scoreClass = 'warning';
            scoreText = '建议关注头型';
        } else if (score < 75) {
            scoreClass = 'caution';
            scoreText = '需要注意观察';
        }
        
        // 根据分数选择颜色
        const circleColor = score >= 75 ? 'var(--success)' : (score >= 60 ? 'var(--warning)' : 'var(--danger)');
        
        return `
        <div class="report-card">
            <div class="report-card-header">
                <span class="report-card-icon">📊</span>
                <h3>综合评估</h3>
            </div>
            <div class="score-container">
                <div class="score-circle">
                    <span class="score-value">${score}</span>
                    <span class="score-label">综合评分</span>
                </div>
            </div>
            <div class="score-desc ${scoreClass}">${scoreText}</div>
            <div style="text-align:center;margin-top:8px;">
                <span style="font-size:13px;color:var(--text-light);">
                    头型分类：<strong>${results.shapeType}</strong>
                </span>
            </div>
            <div style="text-align:center;margin-top:4px;">
                <span style="font-size:12px;color:var(--text-muted);">
                    严重程度：${results.severity} | 置信度：${results.confidence}%
                </span>
            </div>
        </div>`;
    }

    /**
     * 头指数卡片
     */
    _generateCephalicIndexCard(results) {
        const ci = results.cephalicIndex;
        
        // 确定CI所处范围
        let rangeLabel = '';
        let rangeColor = '';
        let barPosition = 50; // 百分比位置
        
        if (ci < 70) {
            rangeLabel = '长头范围';
            rangeColor = '#74B9FF';
            barPosition = Math.max(10, (ci - 60) / 40 * 100);
        } else if (ci < 76) {
            rangeLabel = '偏长头型';
            rangeColor = '#A3D4FF';
            barPosition = 25 + (ci - 70) / 6 * 15;
        } else if (ci <= 81) {
            rangeLabel = '正常范围 ✓';
            rangeColor = 'var(--success)';
            barPosition = 40 + (ci - 76) / 5 * 20;
        } else if (ci <= 85) {
            rangeLabel = '偏短头型';
            rangeColor = '#FFCCD5';
            barPosition = 60 + (ci - 81) / 4 * 15;
        } else {
            rangeLabel = '短头范围';
            rangeColor = '#FF9A9E';
            barPosition = Math.min(90, 75 + (ci - 85) / 10 * 15);
        }
        
        return `
        <div class="report-card">
            <div class="report-card-header">
                <span class="report-card-icon">📏</span>
                <h3>头指数 (Cephalic Index)</h3>
            </div>
            <div style="text-align:center;margin-bottom:12px;">
                <span style="font-size:36px;font-weight:800;color:var(--text);">${ci}</span>
                <span style="font-size:14px;color:var(--text-light);"> %</span>
            </div>
            <div style="position:relative;height:40px;background:linear-gradient(90deg, #74B9FF 0%, #A3D4FF 25%, var(--success) 40%, #FFCCD5 60%, #FF9A9E 75%, #E17055 100%);border-radius:8px;margin-bottom:6px;">
                <div style="position:absolute;top:-8px;left:${barPosition}%;transform:translateX(-50%);width:4px;height:56px;background:var(--secondary);border-radius:2px;"></div>
                <div style="position:absolute;top:-24px;left:${barPosition}%;transform:translateX(-50%);font-size:12px;font-weight:700;color:var(--secondary);white-space:nowrap;">${ci}%</div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);">
                <span>长头</span><span>正常</span><span>短头</span>
            </div>
            <div style="text-align:center;margin-top:8px;font-size:13px;color:${rangeColor};font-weight:600;">
                ${rangeLabel}
            </div>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.5;">
                头指数 = 头宽 ÷ 头长 × 100。正常婴儿头指数范围为76%-81%。数值越高表示头型越宽短，越低表示越窄长。
            </p>
        </div>`;
    }

    /**
     * 关键指标卡片
     */
    _generateMetricsCard(results) {
        const asymmetryPercent = (results.topView.asymmetryRatio * 100).toFixed(1);
        const roundnessPercent = (results.topView.roundness * 100).toFixed(1);
        const flatteningPercent = (results.sideView.flatteningScore * 100).toFixed(1);
        const prominencePercent = (results.sideView.occipitalProminence * 100).toFixed(1);
        
        // 不对称状态
        const asymmetryStatus = results.topView.asymmetryRatio > 0.1 ? '⚠️ 偏高' : '✅ 正常';
        const asymmetryColor = results.topView.asymmetryRatio > 0.1 ? 'var(--warning)' : 'var(--success)';
        
        return `
        <div class="report-card">
            <div class="report-card-header">
                <span class="report-card-icon">📐</span>
                <h3>关键测量数据</h3>
            </div>
            <div class="metrics-grid">
                <div class="metric-item">
                    <div class="metric-value" style="color:${asymmetryColor}">${asymmetryPercent}%</div>
                    <div class="metric-label">不对称度</div>
                    <div class="metric-time">${asymmetryStatus}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${roundnessPercent}%</div>
                    <div class="metric-label">头型圆度</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${flatteningPercent}%</div>
                    <div class="metric-label">扁平化指数</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${prominencePercent}%</div>
                    <div class="metric-label">后脑突出度</div>
                </div>
            </div>
        </div>`;
    }

    /**
     * 生长曲线对照图
     */
    _generateGrowthChartCard(results, babyInfo) {
        const ageDays = babyInfo.ageDays || 90;
        const ageMonths = Math.max(0, Math.round(ageDays / 30.4375));
        const gender = babyInfo.gender || 'girl';
        
        // 模拟不同月龄的参考头围数据 (cm)
        const refData = {
            boy: {
                0: 34.5, 1: 37.0, 2: 38.5, 3: 40.0, 4: 41.0, 5: 42.0,
                6: 43.0, 9: 45.0, 12: 46.5, 18: 48.0, 24: 49.0
            },
            girl: {
                0: 34.0, 1: 36.0, 2: 37.5, 3: 39.0, 4: 40.0, 5: 41.0,
                6: 42.0, 9: 44.0, 12: 45.5, 18: 47.0, 24: 48.0
            }
        };
        
        const selectedData = refData[gender] || refData.girl;
        
        // 构造图表数据点
        const months = [0, 1, 3, 6, 12, 18, 24];
        const maxHC = 55;
        
        let barsHtml = '';
        const parentAge = Math.min(ageMonths, 24);
        const parentHC = selectedData[this._closestMonth(months, parentAge)] || 38;
        
        // 宝宝的实际/参考头围
        const actualHC = babyInfo.headCircumference || parentHC;
        
        months.forEach((m, i) => {
            const hc = selectedData[this._closestMonth(months, m)] || 38;
            const heightPercent = (hc / maxHC) * 100;
            const isCurrent = Math.abs(m - ageMonths) <= 2;
            
            barsHtml += `
            <div class="chart-bar ${gender === 'boy' ? 'male' : 'female'}${isCurrent ? ' current' : ''}" 
                 style="height:${heightPercent}%;"
                 data-height="${heightPercent}">
                <span class="chart-label">${m}月</span>
            </div>`;
        });
        
        // 添加宝宝的柱子（如果有头围数据）
        if (babyInfo.headCircumference) {
            const actualPercent = (actualHC / maxHC) * 100;
            barsHtml += `
            <div class="chart-bar current" style="height:${actualPercent}%;" data-height="${actualPercent}">
                <span class="chart-label">宝宝</span>
            </div>`;
        }
        
        return `
        <div class="report-card">
            <div class="report-card-header">
                <span class="report-card-icon">📈</span>
                <h3>头围生长参考</h3>
            </div>
            <p style="font-size:12px;color:var(--text-light);margin-bottom:10px;">
            图表展示${gender === 'boy' ? '男' : '女'}婴各月龄头围参考值（蓝色/粉色柱）。紫色柱为宝宝当前日龄（${ageDays}天，约${ageMonths}个月）范围。
            </p>
            <div class="growth-chart" id="growth-chart">
                ${barsHtml}
            </div>
            <p style="font-size:10px;color:var(--text-muted);margin-top:8px;text-align:center;">
                * 数据参考WHO儿童生长标准
            </p>
        </div>`;
    }

    /**
     * 分析详情卡片
     */
    _generateAnalysisDetailCard(results) {
        const topView = results.topView;
        const sideView = results.sideView;
        
        return `
        <div class="report-card">
            <div class="report-card-header">
                <span class="report-card-icon">🔬</span>
                <h3>分析详情</h3>
            </div>
            <div style="font-size:13px;color:var(--text-light);line-height:1.8;">
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
                    <span>俯视图形状</span>
                    <strong>${topView.shapeClass}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
                    <span>头部圆度</span>
                    <strong>${(topView.roundness * 100).toFixed(1)}%</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
                    <span>不对称比例</span>
                    <strong>${(topView.asymmetryRatio * 100).toFixed(1)}%</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
                    <span>后脑突出度</span>
                    <strong>${(sideView.occipitalProminence * 100).toFixed(1)}%</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
                    <span>前额角度</span>
                    <strong>${sideView.foreheadAngle.toFixed(1)}°</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
                    <span>扁平化评分</span>
                    <strong>${(sideView.flatteningScore * 100).toFixed(1)}%</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;">
                    <span>分析置信度</span>
                    <strong>${results.confidence}%</strong>
                </div>
            </div>
        </div>`;
    }

    /**
     * 免责声明
     */
    _generateDisclaimer() {
        return `
        <div class="report-disclaimer">
            <p>⚠️ <strong>免责声明</strong></p>
            <p>本App提供的分析结果仅供家长参考和学习使用，<strong>不能替代专业医疗诊断</strong>。</p>
            <p>如对宝宝头型发育有任何担忧，请及时咨询儿科医生或儿童保健专家。</p>
            <p>图像分析结果受拍摄角度、光线条件等因素影响，可能存在一定误差。</p>
        </div>`;
    }

    /**
     * 柱状图动画
     */
    _animateChartBars() {
        const bars = document.querySelectorAll('.chart-bar');
        bars.forEach((bar, index) => {
            const targetHeight = bar.getAttribute('data-height');
            if (targetHeight) {
                // 先重置高度
                bar.style.height = '0px';
                setTimeout(() => {
                    bar.style.height = targetHeight + '%';
                }, 100 + index * 80);
            }
        });
    }

    // ===== 工具方法 =====
    
    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    _formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d} ${h}:${min}`;
    }

    _closestMonth(months, target) {
        let closest = months[0];
        let minDiff = Math.abs(target - months[0]);
        
        for (let i = 1; i < months.length; i++) {
            const diff = Math.abs(target - months[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closest = months[i];
            }
        }
        
        return closest;
    }

    /**
     * 导出报告为图片或PDF（简化版：弹窗打印）
     */
    exportReport() {
        // 创建一个新窗口用于打印
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            alert('请允许弹出窗口以导出报告');
            return;
        }
        
        const reportHtml = this.container ? this.container.innerHTML : '';
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>BabyHeadScan 头型分析报告</title>
                <style>
                    body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; padding: 20px; color: #2D3436; }
                    h1 { text-align: center; color: #FF9A9E; margin-bottom: 5px; }
                    .subtitle { text-align: center; color: #636E72; font-size: 14px; margin-bottom: 20px; }
                    .report-card { border: 1px solid #F0E6EA; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
                    .baby-info-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: #FFF5F7; border-radius: 12px; margin-bottom: 12px; }
                    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                    .metric-item { background: #F8F8FC; padding: 12px; text-align: center; border-radius: 8px; }
                    .suggestions-list { list-style: none; padding: 0; }
                    .suggestions-list li { padding: 8px 0; border-bottom: 1px solid #F0E6EA; }
                    .report-disclaimer { font-size: 11px; color: #B2BEC3; text-align: center; padding: 10px; }
                    .growth-chart { display: flex; align-items: flex-end; justify-content: space-around; height: 150px; background: #F8F8FC; padding: 10px; }
                    .chart-bar { width: 30px; border-radius: 4px 4px 0 0; min-height: 4px; }
                    .chart-bar.male { background: #74B9FF; }
                    .chart-bar.female { background: #FF9A9E; }
                    .chart-bar.current { background: #A18CD1; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <h1>👶 BabyHeadScan</h1>
                <p class="subtitle">婴儿头型扫描分析报告</p>
                ${reportHtml}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }
}

window.ReportGenerator = ReportGenerator;