import React from 'react';
import { useTRPData } from '@/lib/trpData';
import { StatusBadge } from '@/components/StatusBadge';

interface ClientLabelProps {
  clientId?: string;
  clientName?: string;
  className?: string;
}

export const ClientLabel: React.FC<ClientLabelProps> = ({ clientId, clientName, className }) => {
  const { state } = useTRPData();
  const client = clientId ? state.clients.find(c => c.id === clientId) : (clientName ? state.clients.find(c => c.name === clientName) : undefined);
  const display = client ? client.name : (clientName || 'No client');
  const status = client ? client.status : undefined;

  return (
    <span className={`inline-flex items-center gap-2 ${className || ''}`}>
      <span className="text-sm text-foreground/90 font-medium">{display}</span>
      {status && status !== 'active' ? (
        <span className="inline-block">
          <StatusBadge status={String(status)} type="client" className="!px-2 py-0.5" />
        </span>
      ) : null}
    </span>
  );
};

export default ClientLabel;
