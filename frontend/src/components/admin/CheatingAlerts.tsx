import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetchSuspiciousActivities = async () => {
  const response = await fetch('/api/suspicious_activities');
  if (!response.ok) throw new Error('Failed to fetch suspicious activities');
  return response.json();
};

const resumeExam = async () => {
  const response = await fetch('/api/resume_exam', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to resume exam');
  return response.json();
};

export const CheatingAlerts: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['suspiciousActivities'],
    queryFn: fetchSuspiciousActivities,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const resumeMutation = useMutation({
    mutationFn: resumeExam,
    onSuccess: () => {
      toast({
        title: 'Exam Resumed',
        description: 'The exam has been resumed successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['suspiciousActivities'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) return <div>Loading suspicious activities...</div>;
  if (error) return <div>Error loading suspicious activities</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Cheating Alerts</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activities?.map((activity: any) => (
          <Card
            key={activity.timestamp}
            className={`cursor-pointer ${
              selectedActivity?.timestamp === activity.timestamp
                ? 'border-primary'
                : ''
            }`}
            onClick={() => setSelectedActivity(activity)}
          >
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Alert at {new Date(activity.timestamp).toLocaleTimeString()}</span>
                <Badge variant={activity.should_pause ? 'destructive' : 'warning'}>
                  {activity.should_pause ? 'Critical' : 'Warning'}
                </Badge>
              </CardTitle>
              <CardDescription>
                Confidence: {(activity.confidence * 100).toFixed(1)}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h3 className="font-semibold">Reasons:</h3>
                <ul className="list-disc list-inside">
                  {activity.reasons.map((reason: string, index: number) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
                
                <h3 className="font-semibold mt-4">Features:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(activity.features).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-medium">{key}:</span>{' '}
                      {typeof value === 'number' ? value.toFixed(2) : value}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedActivity?.should_pause && (
        <div className="fixed bottom-4 right-4">
          <Button
            onClick={() => resumeMutation.mutate()}
            className="bg-green-600 hover:bg-green-700"
          >
            Resume Exam
          </Button>
        </div>
      )}
    </div>
  );
}; 