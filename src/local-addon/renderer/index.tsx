import * as React from 'react';

interface AddonStatus {
  running: boolean;
  authMethod: string;
  toolCount: number;
  endpoint: string | null;
}

declare const ipcRenderer: {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
};

export default function WpeCApiMcpStatus(): React.ReactElement {
  const [status, setStatus] = React.useState<AddonStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    ipcRenderer
      .invoke('wpe-capi-mcp:status')
      .then((result) => setStatus(result as AddonStatus))
      .catch((err) => setError(String(err)));
  }, []);

  if (error) {
    return <div style={{ padding: 16 }}>
      <strong>WPE CAPI MCP Server</strong>
      <p style={{ color: '#d32f2f' }}>Error: {error}</p>
    </div>;
  }

  if (!status) {
    return <div style={{ padding: 16 }}>
      <strong>WPE CAPI MCP Server</strong>
      <p>Loading...</p>
    </div>;
  }

  return <div style={{ padding: 16 }}>
    <strong>WPE CAPI MCP Server</strong>
    <table style={{ marginTop: 8 }}>
      <tbody>
        <tr>
          <td style={{ paddingRight: 12 }}>Status</td>
          <td>{status.running ? 'Running' : 'Stopped'}</td>
        </tr>
        <tr>
          <td style={{ paddingRight: 12 }}>Auth</td>
          <td>{status.authMethod}</td>
        </tr>
        <tr>
          <td style={{ paddingRight: 12 }}>Tools</td>
          <td>{status.toolCount}</td>
        </tr>
        {status.endpoint && <tr>
          <td style={{ paddingRight: 12 }}>Endpoint</td>
          <td><code>{status.endpoint}</code></td>
        </tr>}
      </tbody>
    </table>
  </div>;
}
