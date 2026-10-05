import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export const Activity: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Activity Log & Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Node-by-node LangGraph trace, comment executions, and retry queue.</p>
        </CardContent>
      </Card>
    </div>
  );
};
