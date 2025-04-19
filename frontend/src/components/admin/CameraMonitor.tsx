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

const fetchCameraStatus = async () => {
  const response = await fetch('/api/camera_status');
  if (!response.ok) throw new Error('Failed to fetch camera status');
  return response.json();
};

const fetchCameraEvents = async () => {
  const response = await fetch('/api/camera_events');
  if (!response.ok) throw new Error('Failed to fetch camera events');
  return response.json();
};

const startCamera = async () => {
  const response = await fetch('/api/start_camera', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to start camera');
  return response.json();
};

const stopCamera = async () => {
  const response = await fetch('/api/stop_camera', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to stop camera');
  return response.json();
};

export const CameraMonitor: React.FC = () => {
  const queryClient = useQueryClient();
  const [isMonitoring, setIsMonitoring] = useState(false);

  const { data: cameraStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['cameraStatus'],
    queryFn: fetchCameraStatus,
    refetchInterval: 1000, // Refresh every second
  });

  const { data: cameraEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['cameraEvents'],
    queryFn: fetchCameraEvents,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const startMutation = useMutation({
    mutationFn: startCamera,
    onSuccess: () => {
      toast({
        title: 'Camera Monitoring Started',
        description: 'Camera-based monitoring has been activated.',
      });
      setIsMonitoring(true);
      queryClient.invalidateQueries({ queryKey: ['cameraStatus', 'cameraEvents'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopCamera,
    onSuccess: () => {
      toast({
        title: 'Camera Monitoring Stopped',
        description: 'Camera-based monitoring has been deactivated.',
      });
      setIsMonitoring(false);
      queryClient.invalidateQueries({ queryKey: ['cameraStatus', 'cameraEvents'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (statusLoading || eventsLoading) return <div>Loading camera status...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Camera Monitoring</h2>
        <div className="space-x-2">
          {!isMonitoring ? (
            <Button
              onClick={() => startMutation.mutate()}
              className="bg-green-600 hover:bg-green-700"
            >
              Start Monitoring
            </Button>
          ) : (
            <Button
              onClick={() => stopMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Stop Monitoring
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Face Detection:</span>
                <Badge variant={cameraStatus?.face_detected ? 'default' : 'destructive'}>
                  {cameraStatus?.face_detected ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Multiple Faces:</span>
                <Badge variant={cameraStatus?.multiple_faces ? 'destructive' : 'default'}>
                  {cameraStatus?.multiple_faces ? 'Detected' : 'None'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Phone Detection:</span>
                <Badge variant={cameraStatus?.phone_detected ? 'destructive' : 'default'}>
                  {cameraStatus?.phone_detected ? 'Detected' : 'None'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Eye Contact:</span>
                <Badge variant={cameraStatus?.looking_away ? 'destructive' : 'default'}>
                  {cameraStatus?.looking_away ? 'Looking Away' : 'Maintained'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
            <CardDescription>
              {cameraStatus?.suspicious_events_count} suspicious events detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cameraEvents?.slice(-5).map((event: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{event.event_type}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 