import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Calendar, Clock, Building2, MapPin, Download } from 'lucide-react';
import { Button } from './ui/button';
import type { Classroom, Schedule, BookingRequest, SignupRequest } from '../App';

interface AdminReportsProps {
  classrooms: Classroom[];
  schedules: Schedule[];
  bookingRequests: BookingRequest[];
  signupRequests: SignupRequest[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const renderPieLabel = (props: { name: string; percent: number }) => {
  const { name, percent } = props;
  return `${name} ${(percent * 100).toFixed(0)}%`;
};

function AdminReports({ classrooms, schedules, bookingRequests, signupRequests }: AdminReportsProps) {
  const [reportPeriod, setReportPeriod] = useState<'week' | 'month' | 'semester'>('month');

  const { start, end } = useMemo(() => {
      const today = new Date();
      const startDate = new Date();
      
      switch (reportPeriod) {
        case 'week':
          startDate.setDate(today.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(today.getMonth() - 1);
          break;
        case 'semester':
          startDate.setMonth(today.getMonth() - 4);
          break;
      }
      
      return { start: startDate, end: today };
  }, [reportPeriod]);

  // Filter data based on date range
  const filteredSchedules = useMemo(() => 
    schedules.filter(s => {
      const scheduleDate = new Date(s.date);
      return scheduleDate >= start && scheduleDate <= end && s.status === 'confirmed';
    }), [schedules, start, end]);

  const filteredRequests = useMemo(() => 
    bookingRequests.filter(r => {
      const requestDate = new Date(r.requestDate);
      return requestDate >= start && requestDate <= end;
    }), [bookingRequests, start, end]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRequests = filteredRequests.length;
    const approvedRequests = filteredRequests.filter(r => r.status === 'approved').length;
    const rejectedRequests = filteredRequests.filter(r => r.status === 'rejected').length;
  const pendingRequests = filteredRequests.filter(r => r.status === 'pending' && !(new Date(r.date) < new Date())).length;
    
    const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests * 100).toFixed(1) : '0';
    
    const totalHours = filteredSchedules.reduce((sum, schedule) => {
      const start = new Date(`2000-01-01 ${schedule.startTime}`);
      const end = new Date(`2000-01-01 ${schedule.endTime}`);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);

    const utilizationRate = classrooms.length > 0 ? 
      (filteredSchedules.length / (classrooms.length * 30) * 100).toFixed(1) : '0';

    return {
      totalRequests,
      approvedRequests,
      rejectedRequests,
      pendingRequests,
      approvalRate: parseFloat(approvalRate),
      totalHours,
      utilizationRate: parseFloat(utilizationRate),
      totalClasses: filteredSchedules.length
    };
  }, [filteredSchedules, filteredRequests, classrooms.length]);

  // Classroom utilization data
  const classroomUtilization = useMemo(() => {
    const usage = classrooms.map(classroom => {
      const classCount = filteredSchedules.filter(s => s.classroomId === classroom.id).length;
      const totalHours = filteredSchedules
        .filter(s => s.classroomId === classroom.id)
        .reduce((sum, schedule) => {
          const start = new Date(`2000-01-01 ${schedule.startTime}`);
          const end = new Date(`2000-01-01 ${schedule.endTime}`);
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }, 0);

      return {
        name: classroom.name,
        classes: classCount,
        hours: Math.round(totalHours * 10) / 10,
        building: classroom.building,
        capacity: classroom.capacity
      };
    });

    return usage.sort((a, b) => b.classes - a.classes);
  }, [classrooms, filteredSchedules]);

  // Request status distribution (memoized to keep identity stable between renders)
  const requestStatusData = useMemo(() => [
    { name: 'Approved', value: stats.approvedRequests, color: '#00C49F' },
    { name: 'Rejected', value: stats.rejectedRequests, color: '#FF8042' },
    { name: 'Pending', value: stats.pendingRequests, color: '#FFBB28' }
  ].filter(item => item.value > 0), [stats.approvedRequests, stats.rejectedRequests, stats.pendingRequests]);
  
  // Weekly usage trend
  const weeklyTrend = useMemo(() => {
    const weeks: { week: string; classes: number; requests: number }[] = [];
    const currentWeek = new Date();

    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(currentWeek);
      weekStart.setDate(currentWeek.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekSchedules = schedules.filter(s => {
        const scheduleDate = new Date(s.date);
        return scheduleDate >= weekStart && scheduleDate <= weekEnd && s.status === 'confirmed';
      });

      weeks.push({
        week: `Week ${8 - i}`,
        classes: weekSchedules.length,
        requests: bookingRequests.filter(r => {
          const requestDate = new Date(r.requestDate);
          return requestDate >= weekStart && requestDate <= weekEnd;
        }).length
      });
    }

    return weeks;
  }, [schedules, bookingRequests]);

  // Building usage distribution
  const buildingUsage = useMemo(() => {
    const usage = new Map();
    
    filteredSchedules.forEach(schedule => {
      const classroom = classrooms.find(c => c.id === schedule.classroomId);
      if (classroom) {
        const current = usage.get(classroom.building) || 0;
        usage.set(classroom.building, current + 1);
      }
    });

    return Array.from(usage.entries()).map(([building, count]) => ({
      name: building,
      value: count
    }));
  }, [filteredSchedules, classrooms]);

  const handleExportReport = () => {
    const reportData = {
      period: reportPeriod,
      dateRange: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      statistics: stats,
      classroomUtilization,
      requestStatusData,
      weeklyTrend,
      buildingUsage,
      generatedAt: new Date().toISOString()
    };

    // Convert report data into CSV with multiple sections. Prepend UTF-8 BOM so Excel opens it correctly.
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') val = JSON.stringify(val);
      const s = String(val);
      if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const sectionToCsv = (headers: string[], rows: any[]) => {
      const lines = [headers.join(',')];
      rows.forEach(r => {
        lines.push(headers.map(h => escapeCsv(r[h])).join(','));
      });
      return lines.join('\r\n');
    };

    // Statistics (key, value)
    const statsRows = Object.keys(reportData.statistics).map(k => ({ key: k, value: (reportData.statistics as any)[k] }));
    const statsSection = sectionToCsv(['key', 'value'], statsRows);

    // Classroom utilization
    const classHeaders = ['name', 'classes', 'hours', 'building', 'capacity'];
    const classSection = sectionToCsv(classHeaders, reportData.classroomUtilization || []);

    // Request status
    const reqHeaders = ['name', 'value'];
    const reqSection = sectionToCsv(reqHeaders, reportData.requestStatusData || []);

    // Weekly trend
    const weekHeaders = ['week', 'classes', 'requests'];
    const weekSection = sectionToCsv(weekHeaders, reportData.weeklyTrend || []);

    // Building usage
    const buildingHeaders = ['name', 'value'];
    const buildingSection = sectionToCsv(buildingHeaders, reportData.buildingUsage || []);

    const csvContent = [
      `Report Period:,${reportData.period}`,
      `Date Range:,"${reportData.dateRange}"`,
      '',
      'Statistics',
      statsSection,
      '',
      'Classroom Utilization',
      classSection,
      '',
      'Request Status',
      reqSection,
      '',
      'Weekly Trend',
      weekSection,
      '',
      'Building Usage',
      buildingSection,
      '',
      `Generated At:,${reportData.generatedAt}`
    ].join('\r\n');

    // UTF-8 BOM to improve Excel compatibility
    const BOM = '\uFEFF';
    const dataBlob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `classroom-report-${reportPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <CardTitle>Classroom Utilization Reports</CardTitle>
                          <CardDescription>Analytics and insights on classroom usage and reservation patterns</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={reportPeriod} onValueChange={(value: 'week' | 'month' | 'semester') => setReportPeriod(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="semester">Last 4 Months</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
            </div>
        </CardHeader>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
            <CardDescription>Analytics and insights on classroom usage and reservation patterns</CardDescription>
        </CardHeader>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalClasses}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(stats.totalHours)} total hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                <p className="text-3xl font-bold text-green-600">{stats.approvalRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">{stats.totalRequests} total requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utilization Rate</p>
                <p className="text-3xl font-bold text-blue-600">{stats.utilizationRate}%</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">Classroom efficiency</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pendingRequests}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classroom Utilization Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Classroom Utilization</CardTitle>
            <CardDescription>Number of classes per classroom</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={classroomUtilization.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="classes" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Request Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Request Status Distribution</CardTitle>
            <CardDescription>Breakdown of reservation request statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {requestStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={requestStatusData}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease"
                    // force remount when values change so animation replays
                    key={requestStatusData.map(d => d.value).join('-')}
                    cx="50%"
                    cy="50%"
                    labelLine={false} // @ts-ignore
                    label={renderPieLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {requestStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No requests data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Usage Trend</CardTitle>
            <CardDescription>Classes and requests over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="classes" stroke="#8884d8" name="Classes" />
                <Line type="monotone" dataKey="requests" stroke="#82ca9d" name="Requests" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Building Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Building Usage Distribution</CardTitle>
            <CardDescription>Classes by building location</CardDescription>
          </CardHeader>
          <CardContent>
            {buildingUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={buildingUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No building usage data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Classrooms */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Classrooms</CardTitle>
          <CardDescription>Most utilized classrooms by class count and hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {classroomUtilization.slice(0, 5).map((classroom, index) => (
              <div key={classroom.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-ios font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{classroom.name}</p>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span>{classroom.building}</span>
                      <span>•</span>
                      <Users className="h-3 w-3" />
                      <span>{classroom.capacity} seats</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{classroom.classes} classes</p>
                  <p className="text-sm text-gray-500">{classroom.hours} hours</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    export default React.memo(AdminReports);