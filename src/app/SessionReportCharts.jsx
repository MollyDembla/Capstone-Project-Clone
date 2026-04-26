import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	PolarAngleAxis,
	RadialBar,
	RadialBarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

const CHART_COLOR = '#00D4AA';

function formatNumber(value, suffix = '') {
	return Number.isFinite(value) ? `${value.toFixed(1)}${suffix}` : 'N/A';
}

export default function SessionReportCharts({ data }) {
	if (!data || !Array.isArray(data.stepMetrics) || data.stepMetrics.length === 0) {
		return null;
	}

	const overallValue = Number.isFinite(data.overallScore) ? data.overallScore : 0;
	const radialData = [{ name: 'Overall', value: overallValue, fill: CHART_COLOR }];

	return (
		<div className="report-charts-grid">
			<div className="report-chart-card">
				<h3>Score Per Step</h3>
				<div className="report-chart-canvas">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data.stepMetrics} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
							<CartesianGrid stroke="rgba(159, 184, 207, 0.16)" vertical={false} />
							<XAxis dataKey="step" stroke="#d8ebfa" tickLine={false} axisLine={{ stroke: 'rgba(159, 184, 207, 0.24)' }} />
							<YAxis stroke="#d8ebfa" domain={[0, 100]} tickLine={false} axisLine={{ stroke: 'rgba(159, 184, 207, 0.24)' }} />
							<Tooltip
								cursor={{ fill: 'rgba(0, 212, 170, 0.08)' }}
								contentStyle={{
									background: '#0a1e2f',
									border: '1px solid rgba(159, 184, 207, 0.3)',
									borderRadius: '10px',
									color: '#e7f3ff',
								}}
							/>
							<Bar dataKey="score" fill={CHART_COLOR} radius={[8, 8, 0, 0]} maxBarSize={48} />
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>

			<div className="report-chart-card">
				<h3>Timing Per Step</h3>
				<div className="report-chart-canvas">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={data.stepMetrics} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
							<CartesianGrid stroke="rgba(159, 184, 207, 0.16)" vertical={false} />
							<XAxis dataKey="step" stroke="#d8ebfa" tickLine={false} axisLine={{ stroke: 'rgba(159, 184, 207, 0.24)' }} />
							<YAxis stroke="#d8ebfa" tickLine={false} axisLine={{ stroke: 'rgba(159, 184, 207, 0.24)' }} />
							<Tooltip
								formatter={(value) => formatNumber(Number(value), 's')}
								contentStyle={{
									background: '#0a1e2f',
									border: '1px solid rgba(159, 184, 207, 0.3)',
									borderRadius: '10px',
									color: '#e7f3ff',
								}}
							/>
							<Line type="monotone" dataKey="timing" stroke={CHART_COLOR} strokeWidth={3} dot={{ fill: CHART_COLOR, r: 4 }} activeDot={{ r: 6 }} />
						</LineChart>
					</ResponsiveContainer>
				</div>
			</div>

			<div className="report-chart-card report-chart-card-radial">
				<h3>Overall Accuracy</h3>
				<div className="report-chart-canvas report-chart-radial-wrap">
					<ResponsiveContainer width="100%" height="100%">
						<RadialBarChart
							cx="50%"
							cy="50%"
							innerRadius="68%"
							outerRadius="96%"
							startAngle={90}
							endAngle={-270}
							barSize={18}
							data={radialData}
						>
							<PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
							<RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'rgba(159, 184, 207, 0.16)' }} />
						</RadialBarChart>
					</ResponsiveContainer>
					<div className="report-radial-center-value">
						<strong>{Number.isFinite(data.overallScore) ? `${Math.round(data.overallScore)}%` : 'N/A'}</strong>
						<span>Final Score</span>
					</div>
				</div>
			</div>
		</div>
	);
}
