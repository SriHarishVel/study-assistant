import React from "react";

function ChartSection({ block }) {
  if (!block) {
    return (
      <div className="chart-section-card chart-empty-state">
        <div className="chart-empty-icon">📊</div>
        <h4>No charts needed</h4>
        <p>
          This topic is better explained through notes, flashcards, and quizzes.
          The AI didn't find a meaningful visualization to create.
        </p>
      </div>
    );
  }

  const { title, description, chartType, data } = block;

  const colors = [
    "#6366f1",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
  ];

  const chartData = Array.isArray(data)
    ? data.filter(
        (item) =>
          item &&
          typeof item.label === "string" &&
          typeof item.value === "number" &&
          Number.isFinite(item.value),
      )
    : [];

  const maxValue = Math.max(
    ...chartData.map((item) => Math.abs(item.value)),
    1,
  );

  const total = chartData.reduce(
    (sum, item) => sum + Math.max(item.value, 0),
    0,
  );

  const nodes = Array.isArray(block.nodes) ? block.nodes : [];
  const connections = Array.isArray(block.connections) ? block.connections : [];

  const nodeIds = new Set(nodes.map((node) => node.id));

  const validFlowchart =
    chartType === "flowchart" &&
    nodes.length >= 2 &&
    connections.length >= 1 &&
    nodes.every(
      (node) =>
        node &&
        typeof node.id === "string" &&
        !!node.id.trim() &&
        typeof node.label === "string" &&
        !!node.label.trim(),
    ) &&
    connections.every(
      (connection) =>
        connection &&
        nodeIds.has(connection.from) &&
        nodeIds.has(connection.to),
    );

  const renderBarChart = () => {
    if (chartData.length < 2) {
      return <p className="muted">Not enough data to display this chart.</p>;
    }

    return (
      <div className="chart-bars">
        {chartData.map((item, index) => {
          const percentage = (Math.abs(item.value) / maxValue) * 100;

          return (
            <div className="chart-bar-item" key={index}>
              <div className="chart-bar-label">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>

              <div className="chart-bar-track">
                <div
                  className="chart-bar-fill"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: colors[index % colors.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLineChart = () => {
    if (chartData.length < 2) {
      return <p className="muted">Not enough data to display this chart.</p>;
    }

    const width = 600;
    const height = 260;
    const padding = 35;

    const minValue = Math.min(...chartData.map((item) => item.value), 0);
    const actualMax = Math.max(...chartData.map((item) => item.value), 1);
    const range = actualMax - minValue || 1;

    const points = chartData.map((item, index) => {
      const x =
        padding + (index / (chartData.length - 1)) * (width - padding * 2);

      const y =
        height -
        padding -
        ((item.value - minValue) / range) * (height - padding * 2);

      return { x, y, ...item };
    });

    const path = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    return (
      <div className="chart-line-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Line chart: ${title}`}
          className="chart-line-svg"
        >
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="currentColor"
            opacity="0.25"
          />

          <path
            d={path}
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r="5" fill="#6366f1">
              <title>
                {point.label}: {point.value}
              </title>
            </circle>
          ))}
        </svg>

        <div className="chart-line-labels">
          {chartData.map((item, index) => (
            <div key={index}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPieChart = () => {
    if (total <= 0 || chartData.length < 2) {
      return <p className="muted">Pie chart requires positive values.</p>;
    }

    let cumulativePercentage = 0;

    const gradient = chartData
      .map((item, index) => {
        const percentage = (Math.max(item.value, 0) / total) * 100;

        const start = cumulativePercentage;
        cumulativePercentage += percentage;

        return `${colors[index % colors.length]} ${start}% ${cumulativePercentage}%`;
      })
      .join(", ");

    return (
      <div className="chart-pie-container">
        <div
          className="chart-pie"
          style={{
            background: `conic-gradient(${gradient})`,
          }}
          role="img"
          aria-label={`Pie chart: ${title}`}
        />

        <div className="chart-legend">
          {chartData.map((item, index) => (
            <div className="chart-legend-item" key={index}>
              <span
                className="chart-legend-color"
                style={{
                  backgroundColor: colors[index % colors.length],
                }}
              />

              <span>{item.label}</span>

              <strong>
                {((Math.max(item.value, 0) / total) * 100).toFixed(1)}%
              </strong>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFlowchart = () => {
    if (!validFlowchart) {
      return <p className="muted">Unable to display this flowchart.</p>;
    }

    return (
      <div className="flowchart-container">
        {nodes.map((node, index) => {
          const outgoing = connections.filter(
            (connection) => connection.from === node.id,
          );

          return (
            <React.Fragment key={node.id}>
              <div className="flowchart-node">
                <div className="flowchart-node-number">{index + 1}</div>
                <div className="flowchart-node-label">{node.label}</div>
              </div>

              {outgoing.length > 0 && (
                <div className="flowchart-connections">
                  {outgoing.map((connection, connectionIndex) => {
                    const targetNode = nodes.find(
                      (item) => item.id === connection.to,
                    );

                    return (
                      <div
                        className="flowchart-connection"
                        key={`${connection.from}-${connection.to}-${connectionIndex}`}
                      >
                        {connection.label && (
                          <span className="flowchart-connection-label">
                            {connection.label}
                          </span>
                        )}

                        <div className="flowchart-arrow">
                          <span />
                        </div>

                        <div className="flowchart-target-label">
                          {targetNode?.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="chart-section-card chart-card-spacing">
      <div className="chart-section-header">
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>

        <span className="chart-type-badge">{chartType}</span>
      </div>

      <div className="chart-content">
        {chartType === "bar" && renderBarChart()}
        {chartType === "line" && renderLineChart()}
        {chartType === "pie" && renderPieChart()}
        {chartType === "flowchart" && renderFlowchart()}

        {!["bar", "line", "pie", "flowchart"].includes(chartType) && (
          <p className="muted">Unsupported chart type.</p>
        )}
      </div>
    </div>
  );
}

export default ChartSection;