import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, MapPin, Users, Clock, CheckCircle, XCircle, Wifi as LucideWifi } from 'lucide-react';
import * as Phosphor from '@phosphor-icons/react';
import Calendar from './ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { convertTo12Hour, formatTimeRange, generateTimeSlots, convertTo24Hour, isValidTimeRange, isPastBookingTime, getValidEndTimes } from '../utils/timeUtils';
import type { Classroom, Schedule, BookingRequest } from '../App';

interface RoomSearchProps {
  classrooms: Classroom[];
  schedules: Schedule[];
  bookingRequests: BookingRequest[];
}

const timeSlots = generateTimeSlots();

const phosphorIndex = Phosphor as unknown as Record<string, React.ElementType | undefined>;
const getPhosphorIcon = (names: string[]) => {
  for (const n of names) {
    const Comp = phosphorIndex[n] ?? phosphorIndex[`${n}Icon`];
    if (Comp) return <Comp className="h-4 w-4" />;
  }
  return null;
};

const equipmentIcons: { [key: string]: React.ReactNode } = {
  'Projector': getPhosphorIcon(['ProjectorScreenChart', 'Projector', 'ProjectorScreen']),
  'Computer': getPhosphorIcon(['Monitor', 'Desktop']),
  'Computers': getPhosphorIcon(['Monitor', 'Desktop']),
  'WiFi': getPhosphorIcon(['Wifi', 'WifiSimple']),
  'Whiteboard': getPhosphorIcon(['Chalkboard', 'ChalkboardSimple']) || getPhosphorIcon(['Note']),
  'TV': getPhosphorIcon(['Television', 'Tv', 'MonitorPlay']),
  'Podium': getPhosphorIcon(['Podium', 'Presentation', 'Microphone']) || getPhosphorIcon(['SpeakerHigh']),
  // Common variants that may appear in classroom data
  'Speakers': getPhosphorIcon(['SpeakerHigh', 'SpeakerSimple']) || getPhosphorIcon(['Speaker']),
  'Speaker': getPhosphorIcon(['SpeakerHigh', 'SpeakerSimple']) || getPhosphorIcon(['Speaker']),
  'Air Conditioner': getPhosphorIcon(['Fan', 'FanSimple', 'Snowflake']) || null,
  'AC': getPhosphorIcon(['Fan', 'FanSimple', 'Snowflake']) || null,
};

const normalize = (s: string) => s.replace(/[^a-z0-9]/gi, '').toLowerCase();

// Robust lookup for equipment icons: normalized exact match, singular/plural, WiFi fallback
const getIconForEquipment = (eq?: string) => {
  if (!eq) return null;
  const rawKey = Object.keys(equipmentIcons).find(k => normalize(k) === normalize(eq));
  if (rawKey) return equipmentIcons[rawKey];
  const singularAttempt = eq.endsWith('s') ? eq.slice(0, -1) : `${eq}s`;
  const spKey = Object.keys(equipmentIcons).find(k => normalize(k) === normalize(singularAttempt));
  if (spKey) return equipmentIcons[spKey];

  // wifi fallback (only match 'wifi' to avoid collisions with words like 'whiteboard')
  if (normalize(eq).includes('wifi')) {
    return <LucideWifi className="h-4 w-4" />;
  }

  return null;
};

export default function RoomSearch({ classrooms, schedules, bookingRequests }: RoomSearchProps) {
  const [searchFilters, setSearchFilters] = useState({
    date: '',
    startTime: '',
    endTime: '',
    minCapacity: '',
    equipment: ''
  });

  // Defensive handlers to prevent selecting disabled times (some Select implementations
  // may still trigger onValueChange in edge cases). These double-check business rules
  // and ignore selections that should be disabled.
  const handleStartTimeChange = (value: string) => {
    if (!value) {
      setSearchFilters(prev => ({ ...prev, startTime: '' }));
      return;
    }

    const conflictType = getTimeSlotConflictType(value, true);
    const isDisabled = Boolean(searchFilters.date && (conflictType !== 'none' || isPastBookingTime(searchFilters.date, value)));
    if (isDisabled) return; // ignore disabled selections

    // Clear endTime if it becomes invalid relative to the new startTime
    setSearchFilters(prev => ({
      ...prev,
      startTime: value,
      endTime: prev.endTime && isValidTimeRange(value, prev.endTime) ? prev.endTime : ''
    }));
  };

  const handleEndTimeChange = (value: string) => {
    if (!value) {
      setSearchFilters(prev => ({ ...prev, endTime: '' }));
      return;
    }

    // If a start time exists, compute valid end times and ignore selections that are not valid
    const validEndTimes = searchFilters.startTime ? getValidEndTimes(searchFilters.startTime, timeSlots) : timeSlots;
    const isDisabled = Boolean(searchFilters.startTime && !validEndTimes.includes(value));
    if (isDisabled) return;

    // Also ignore end times that cause conflicts across available classrooms
    const conflictType = getTimeSlotConflictType(value, false);
    if (conflictType !== 'none') return;

    setSearchFilters(prev => ({ ...prev, endTime: value }));
  };

  // Get minimum date (today) in local timezone to avoid offset issues
  const today = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const formatISOToMDY = (iso?: string) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [y, m, d] = parts;
    return `${m}/${d}/${y}`;
  };

  const [isSmallPhone, setIsSmallPhone] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 320px) and (max-width: 425px)');
    const update = () => setIsSmallPhone(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, []);

  const [dateError, setDateError] = React.useState<string | null>(null);
  const isValidISODate = (iso?: string) => {
    if (!iso) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const [yStr, mStr, dStr] = iso.split('-');
    const y = Number(yStr); const m = Number(mStr); const d = Number(dStr);
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d;
  };

  // Check if classroom is available for given time slot
  const isClassroomAvailable = (classroomId: string, date: string, startTime: string, endTime: string): boolean => {
    if (!date || !startTime || !endTime) return true;

    // Convert 12-hour format to 24-hour for comparison with stored schedule data
    const startTime24 = convertTo24Hour(startTime);
    const endTime24 = convertTo24Hour(endTime);

    // Check confirmed schedules
    const scheduleConflict = schedules.some(schedule => 
      schedule.classroomId === classroomId &&
      schedule.date === date &&
      schedule.status === 'confirmed' &&
      (
        (startTime24 >= schedule.startTime && startTime24 < schedule.endTime) ||
        (endTime24 > schedule.startTime && endTime24 <= schedule.endTime) ||
        (startTime24 <= schedule.startTime && endTime24 >= schedule.endTime)
      )
    );

    // Check pending booking requests
    const pendingConflict = bookingRequests.some(request => 
      request.classroomId === classroomId &&
      request.date === date &&
      request.status === 'pending' &&
      (
        (startTime24 >= request.startTime && startTime24 < request.endTime) ||
        (endTime24 > request.startTime && endTime24 <= request.endTime) ||
        (startTime24 <= request.startTime && endTime24 >= request.endTime)
      )
    );

    return !scheduleConflict && !pendingConflict;
  };

  // Get conflict type for time slot
  const getTimeSlotConflictType = (time: string, isStartTime: boolean = true): 'none' | 'confirmed' | 'pending' | 'both' => {
    if (!searchFilters.date) return 'none';
    
    const availableClassrooms = classrooms.filter(c => c.isAvailable);
    if (availableClassrooms.length === 0) return 'none';

    let hasConfirmedConflict = false;
    let hasPendingConflict = false;

    if (isStartTime) {
      availableClassrooms.forEach(classroom => {
        // Check confirmed schedules
        const scheduleConflict = schedules.some(schedule => 
          schedule.classroomId === classroom.id &&
          schedule.date === searchFilters.date &&
          schedule.status === 'confirmed' &&
          convertTo24Hour(time) >= schedule.startTime && 
          convertTo24Hour(time) < schedule.endTime
        );
        
        // Check pending booking requests
        const pendingConflict = bookingRequests.some(request => 
          request.classroomId === classroom.id &&
          request.date === searchFilters.date &&
          request.status === 'pending' &&
          convertTo24Hour(time) >= request.startTime && 
          convertTo24Hour(time) < request.endTime
        );
        
        if (scheduleConflict) hasConfirmedConflict = true;
        if (pendingConflict) hasPendingConflict = true;
      });
    } else {
      // For end time, check with selected start time
      if (!searchFilters.startTime) return 'none';
      availableClassrooms.forEach(classroom => {
        const available = isClassroomAvailable(classroom.id, searchFilters.date, searchFilters.startTime, time);
        if (!available) {
          // Need to determine if it's confirmed or pending conflict
          const scheduleConflict = schedules.some(schedule => 
            schedule.classroomId === classroom.id &&
            schedule.date === searchFilters.date &&
            schedule.status === 'confirmed' &&
            (
              (convertTo24Hour(searchFilters.startTime) >= schedule.startTime && convertTo24Hour(searchFilters.startTime) < schedule.endTime) ||
              (convertTo24Hour(time) > schedule.startTime && convertTo24Hour(time) <= schedule.endTime) ||
              (convertTo24Hour(searchFilters.startTime) <= schedule.startTime && convertTo24Hour(time) >= schedule.endTime)
            )
          );
          
          const pendingConflict = bookingRequests.some(request => 
            request.classroomId === classroom.id &&
            request.date === searchFilters.date &&
            request.status === 'pending' &&
            (
              (convertTo24Hour(searchFilters.startTime) >= request.startTime && convertTo24Hour(searchFilters.startTime) < request.endTime) ||
              (convertTo24Hour(time) > request.startTime && convertTo24Hour(time) <= request.endTime) ||
              (convertTo24Hour(searchFilters.startTime) <= request.startTime && convertTo24Hour(time) >= request.endTime)
            )
          );
          
          if (scheduleConflict) hasConfirmedConflict = true;
          if (pendingConflict) hasPendingConflict = true;
        }
      });
    }

    if (hasConfirmedConflict && hasPendingConflict) return 'both';
    if (hasConfirmedConflict) return 'confirmed';
    if (hasPendingConflict) return 'pending';
    return 'none';
  };

  // Check if a time slot has conflicts across any available classroom
  const hasTimeSlotConflicts = (time: string, isStartTime: boolean = true): boolean => {
    if (!searchFilters.date) return false;
    
    const availableClassrooms = classrooms.filter(c => c.isAvailable);
    if (availableClassrooms.length === 0) return false;

    // For start time, check if this time would conflict with any booking
    if (isStartTime) {
      return availableClassrooms.some(classroom => {
        // Check confirmed schedules
        const scheduleConflict = schedules.some(schedule => 
          schedule.classroomId === classroom.id &&
          schedule.date === searchFilters.date &&
          schedule.status === 'confirmed' &&
          convertTo24Hour(time) >= schedule.startTime && 
          convertTo24Hour(time) < schedule.endTime
        );
        
        // Check pending booking requests
        const pendingConflict = bookingRequests.some(request => 
          request.classroomId === classroom.id &&
          request.date === searchFilters.date &&
          request.status === 'pending' &&
          convertTo24Hour(time) >= request.startTime && 
          convertTo24Hour(time) < request.endTime
        );
        
        return scheduleConflict || pendingConflict;
      });
    } else {
      // For end time, check with selected start time
      if (!searchFilters.startTime) return false;
      return availableClassrooms.some(classroom => 
        !isClassroomAvailable(classroom.id, searchFilters.date, searchFilters.startTime, time)
      );
    }
  };

  // Filter and search classrooms
  const filteredClassrooms = useMemo(() => {
    let filtered = classrooms.filter(classroom => classroom.isAvailable);

    // Filter by capacity
    if (searchFilters.minCapacity) {
      const minCap = parseInt(searchFilters.minCapacity);
      filtered = filtered.filter(c => c.capacity >= minCap);
    }

    // Filter by equipment
    if (searchFilters.equipment) {
      filtered = filtered.filter(c => 
        c.equipment.some(eq => 
          eq.toLowerCase().includes(searchFilters.equipment.toLowerCase())
        )
      );
    }

    // Filter by availability for the specified time slot
    if (searchFilters.date && searchFilters.startTime && searchFilters.endTime) {
      filtered = filtered.filter(c => 
        isClassroomAvailable(c.id, searchFilters.date, searchFilters.startTime, searchFilters.endTime)
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [classrooms, schedules, searchFilters]);

  const handleSearch = () => {
    // The filtering happens automatically through useMemo
    // This function can be used for additional search actions if needed
  };

  const clearFilters = () => {
    setSearchFilters({
      date: '',
      startTime: '',
      endTime: '',
      minCapacity: '',
      equipment: ''
    });
  };

  const hasActiveFilters = Object.values(searchFilters).some(value => value !== '');

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Available Classrooms</CardTitle>
          <CardDescription>Find classrooms that meet your requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date and Time Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search-date">Date</Label>
                {isSmallPhone ? (
                  <div>
                    <input
                      id="search-date"
                      type="date"
                      min={today}
                      value={searchFilters.date}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) {
                          setSearchFilters(prev => ({ ...prev, date: '' }));
                          setDateError(null);
                          return;
                        }
                        if (!isValidISODate(v)) {
                          setDateError('Invalid date');
                        } else if (v < today) {
                          setDateError('Date must be today or later');
                        } else {
                          setDateError(null);
                          setSearchFilters(prev => ({ ...prev, date: v }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-surface border rounded-md"
                    />
                    {dateError && <p className="text-xs text-red-600 mt-1">{dateError}</p>}
                  </div>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 bg-surface hover:bg-muted/50 border rounded-md flex items-center justify-between"
                      >
                        <span className={`text-sm ${searchFilters.date ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {searchFilters.date ? formatISOToMDY(searchFilters.date) : 'Select a date'}
                        </span>
                        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 9l4 4 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <div className="-mt-2">
                        <Calendar
                          value={searchFilters.date || undefined}
                          onSelect={(iso) => {
                            if (!iso) { setSearchFilters(prev => ({ ...prev, date: '' })); setDateError(null); return; }
                            if (!isValidISODate(iso) || iso < today) setDateError('Invalid or past date');
                            else { setDateError(null); setSearchFilters(prev => ({ ...prev, date: iso })); }
                          }}
                          min={today}
                          className="md:w-[280px]"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-start">Start Time</Label>
              <Select value={searchFilters.startTime} onValueChange={handleStartTimeChange}>
                <SelectTrigger id="search-start">
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => {
                    const conflictType = getTimeSlotConflictType(time, true);
                    const hasConflicts = conflictType !== 'none';
                    
                    const getBadgeText = () => {
                      switch (conflictType) {
                        case 'pending': return 'Pending';
                        case 'confirmed': return 'Reserved';
                        case 'both': return 'Limited';
                        default: return '';
                      }
                    };

                    const getBadgeClass = () => {
                      switch (conflictType) {
                        case 'pending': return 'ml-2 text-xs border-yellow-300 text-yellow-700 bg-yellow-50';
                        case 'confirmed': return 'ml-2 text-xs border-red-300 text-red-700 bg-red-50';
                        case 'both': return 'ml-2 text-xs border-orange-300 text-orange-600 bg-orange-50';
                        default: return '';
                      }
                    };
                    
                    return (
                      <SelectItem 
                        key={time} 
                        value={time}
                        className={hasConflicts ? "text-gray-400 opacity-60" : ""}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{time}</span>
                          {hasConflicts && (
                            <Badge variant="outline" className={getBadgeClass()}>
                              {getBadgeText()}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-end">End Time</Label>
              <Select value={searchFilters.endTime} onValueChange={handleEndTimeChange}>
                <SelectTrigger id="search-end">
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => {
                    const isDisabled = Boolean(searchFilters.startTime && time <= searchFilters.startTime);
                    const conflictType = !isDisabled ? getTimeSlotConflictType(time, false) : 'none';
                    const hasConflicts = conflictType !== 'none';
                    
                    const getBadgeText = () => {
                      switch (conflictType) {
                        case 'pending': return 'Pending';
                        case 'confirmed': return 'Reserved';
                        case 'both': return 'Limited';
                        default: return '';
                      }
                    };

                    const getBadgeClass = () => {
                      switch (conflictType) {
                        case 'pending': return 'ml-2 text-xs border-yellow-300 text-yellow-700 bg-yellow-50';
                        case 'confirmed': return 'ml-2 text-xs border-red-300 text-red-700 bg-red-50';
                        case 'both': return 'ml-2 text-xs border-orange-300 text-orange-600 bg-orange-50';
                        default: return '';
                      }
                    };
                    
                    return (
                      <SelectItem 
                        key={time} 
                        value={time}
                        disabled={isDisabled}
                        className={hasConflicts ? "text-gray-400 opacity-60" : ""}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{time}</span>
                          {hasConflicts && !isDisabled && (
                            <Badge variant="outline" className={getBadgeClass()}>
                              {getBadgeText()}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search-capacity">Minimum Capacity</Label>
              <Input
                id="search-capacity"
                type="number"
                placeholder="e.g., 30"
                min="1"
                value={searchFilters.minCapacity}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, minCapacity: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-equipment">Equipment</Label>
              <Input
                id="search-equipment"
                placeholder="e.g., Projector, Computer"
                value={searchFilters.equipment}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, equipment: e.target.value }))}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4">
            <div className="flex space-x-2">
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredClassrooms.length} of {classrooms.filter(c => c.isAvailable).length} available classrooms
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      <div className="space-y-4">
        {filteredClassrooms.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {hasActiveFilters ? 'No Matching Classrooms' : 'Start Your Search'}
              </h3>
              <p className="text-gray-600">
                {hasActiveFilters 
                  ? 'Try adjusting your search criteria to find available classrooms.'
                  : 'Use the filters above to search for available classrooms that meet your needs.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClassrooms.map((classroom) => {
              const isAvailableForSearch = !searchFilters.date || !searchFilters.startTime || !searchFilters.endTime || 
                isClassroomAvailable(classroom.id, searchFilters.date, searchFilters.startTime, searchFilters.endTime);

              return (
                <Card key={classroom.id} className={`${isAvailableForSearch ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{classroom.name}</h3>
                        <div className="flex items-center space-x-1">
                          {isAvailableForSearch ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <Badge variant={isAvailableForSearch ? 'default' : 'destructive'}>
                            {isAvailableForSearch ? 'Available' : 'Occupied'}
                          </Badge>
                        </div>
                      </div>

                      {/* Location & Capacity */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{classroom.building}, Floor {classroom.floor}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>{classroom.capacity} seats</span>
                        </div>
                      </div>

                      {/* Equipment */}
                      {classroom.equipment.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Equipment:</p>
                          <div className="flex flex-wrap gap-1">
                            {classroom.equipment.map((eq, index) => (
                              <Badge key={index} variant="secondary" className="text-xs flex items-center space-x-1">
                                {getIconForEquipment(eq) && <span>{getIconForEquipment(eq)}</span>}
                                <span>{eq}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Time Display */}
                      {searchFilters.date && searchFilters.startTime && searchFilters.endTime && (
                        <div className="pt-2 border-t border-gray-200">
                          <div className="flex items-center space-x-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">
                              {searchFilters.date} • {searchFilters.startTime}-{searchFilters.endTime}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}