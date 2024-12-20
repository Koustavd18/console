import { Paper, Skeleton, Stack, Text } from '@mantine/core';
import classes from '../styles/EventTimeLineGraph.module.css';
import { useQueryResult } from '@/hooks/useQueryResult';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ChartTooltipProps, AreaChart } from '@mantine/charts';
import { HumanizeNumber } from '@/utils/formatBytes';
import { logsStoreReducers, useLogsStore } from '../providers/LogsProvider';
import { appStoreReducers, useAppStore } from '@/layouts/MainLayout/providers/AppProvider';
import { useFilterStore, filterStoreReducers } from '../providers/FilterProvider';
import { LogsResponseWithHeaders } from '@/@types/parseable/api/query';
import _ from 'lodash';
import timeRangeUtils from '@/utils/timeRangeUtils';
import { useStreamStore } from '../providers/StreamProvider';

const { setTimeRange } = appStoreReducers;
const { parseQuery } = filterStoreReducers;
const { makeTimeRangeLabel } = timeRangeUtils;
const { getCleanStoreForRefetch } = logsStoreReducers;

type CompactInterval = 'minute' | 'day' | 'hour' | 'quarter-hour' | 'half-hour' | 'month';

function extractWhereClause(sql: string) {
	const whereClauseRegex = /WHERE\s+(.*?)(?=\s*(ORDER\s+BY|GROUP\s+BY|OFFSET|LIMIT|$))/i;
	const match = sql.match(whereClauseRegex);
	if (match) {
		return match[1].trim();
	}
	return '(1 = 1)';
}

function removeOffsetFromQuery(query: string): string {
	const offsetRegex = /\sOFFSET\s+\d+/i;
	return query.replace(offsetRegex, '');
}

const getCompactType = (interval: number): CompactInterval => {
	const totalMinutes = interval / (1000 * 60);
	if (totalMinutes <= 60) {
		// upto 1 hour
		return 'minute';
	} else if (totalMinutes <= 300) {
		// upto 5 hours
		return 'quarter-hour';
	} else if (totalMinutes <= 1440) {
		// upto 5 hours
		return 'half-hour';
	} else if (totalMinutes <= 4320) {
		// upto 3 days
		return 'hour';
	} else if (totalMinutes <= 259200) {
		return 'day';
	} else {
		return 'month';
	}
};

const getStartOfTs = (time: Date, compactType: CompactInterval): Date => {
	if (compactType === 'minute') {
		return time;
	} else if (compactType === 'hour') {
		return new Date(time.getFullYear(), time.getMonth(), time.getDate(), time.getHours());
	} else if (compactType === 'quarter-hour') {
		const roundOff = 1000 * 60 * 15;
		return new Date(Math.floor(time.getTime() / roundOff) * roundOff);
	} else if (compactType === 'half-hour') {
		const roundOff = 1000 * 60 * 30;
		return new Date(Math.floor(time.getTime() / roundOff) * roundOff);
	} else if (compactType === 'day') {
		return new Date(time.getFullYear(), time.getMonth(), time.getDate());
	} else {
		return new Date(time.getFullYear(), time.getMonth());
	}
};

const getEndOfTs = (time: Date, compactType: CompactInterval): Date => {
	if (compactType === 'minute') {
		return time;
	} else if (compactType === 'hour') {
		return new Date(time.getFullYear(), time.getMonth(), time.getDate(), time.getHours() + 1);
	} else if (compactType === 'quarter-hour') {
		const roundOff = 1000 * 60 * 15;
		return new Date(Math.round(time.getTime() / roundOff) * roundOff);
	} else if (compactType === 'half-hour') {
		const roundOff = 1000 * 60 * 30;
		return new Date(Math.round(time.getTime() / roundOff) * roundOff);
	} else if (compactType === 'day') {
		return new Date(time.getFullYear(), time.getMonth(), time.getDate() + 1);
	} else {
		return new Date(time.getFullYear(), time.getMonth() + 1);
	}
};

const incrementDateByCompactType = (date: Date, type: CompactInterval): Date => {
	const tempDate = new Date(date);
	if (type === 'minute') {
		tempDate.setMinutes(tempDate.getMinutes() + 1);
	} else if (type === 'hour') {
		tempDate.setHours(tempDate.getHours() + 1);
	} else if (type === 'day') {
		tempDate.setDate(tempDate.getDate() + 1);
	} else if (type === 'quarter-hour') {
		tempDate.setMinutes(tempDate.getMinutes() + 15);
	} else if (type === 'half-hour') {
		tempDate.setMinutes(tempDate.getMinutes() + 30);
	} else if (type === 'month') {
		tempDate.setMonth(tempDate.getMonth() + 1);
	} else {
		tempDate;
	}
	return new Date(tempDate);
};

const getAllIntervals = (start: Date, end: Date, compactType: CompactInterval): Date[] => {
	const result = [];
	let currentDate = new Date(start);

	while (currentDate <= end) {
		result.push(new Date(currentDate));
		currentDate = incrementDateByCompactType(currentDate, compactType);
	}

	return result;
};

const getModifiedTimeRange = (
	startTime: Date,
	endTime: Date,
	interval: number,
): { modifiedStartTime: Date; modifiedEndTime: Date; compactType: CompactInterval } => {
	const compactType = getCompactType(interval);
	const modifiedStartTime = getStartOfTs(startTime, compactType);
	const modifiedEndTime = getEndOfTs(endTime, compactType);
	return { modifiedEndTime, modifiedStartTime, compactType };
};

const compactTypeIntervalMap = {
	minute: '1 minute',
	hour: '1 hour',
	day: '24 hour',
	'quarter-hour': '15 minute',
	'half-hour': '30 minute',
	month: '1 month',
};

const generateCountQuery = (
	streamName: string,
	startTime: Date,
	endTime: Date,
	compactType: CompactInterval,
	whereClause: string,
) => {
	const range = compactTypeIntervalMap[compactType];
	/* eslint-disable no-useless-escape */
	return `SELECT DATE_BIN('${range}', p_timestamp, '${startTime.toISOString()}') AS date_bin_timestamp, COUNT(*) AS log_count FROM \"${streamName}\" WHERE p_timestamp BETWEEN '${startTime.toISOString()}' AND '${endTime.toISOString()}' AND ${whereClause} GROUP BY date_bin_timestamp ORDER BY date_bin_timestamp`;
};

const NoDataView = (props: { isError: boolean }) => {
	return (
		<Stack style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
			<Stack className={classes.noDataContainer}>
				<Text className={classes.noDataText}>
					{props.isError ? 'Failed to fetch data' : ' No new events in the selected time range.'}
				</Text>
			</Stack>
		</Stack>
	);
};

const calcAverage = (data: LogsResponseWithHeaders | undefined) => {
	if (!data || !Array.isArray(data?.records)) return 0;

	const { fields, records } = data;
	if (_.isEmpty(records) || !_.includes(fields, 'log_count')) return 0;

	const total = records.reduce((acc, d) => {
		return acc + _.toNumber(d.log_count) || 0;
	}, 0);
	return parseInt(Math.abs(total / records.length).toFixed(0));
};

type GraphTickItem = {
	events: number;
	minute: Date;
	aboveAvgPercent: number;
	compactType: CompactInterval;
	startTime: dayjs.Dayjs;
	endTime: dayjs.Dayjs;
};

// date_bin removes tz info
// filling data with empty values where there is no rec
const parseGraphData = (
	data: LogsResponseWithHeaders | undefined,
	avg: number,
	startTime: Date,
	endTime: Date,
	interval: number,
): GraphTickItem[] => {
	if (!data || !Array.isArray(data?.records)) return [];

	const { fields, records } = data;
	if (_.isEmpty(records) || !_.includes(fields, 'log_count') || !_.includes(fields, 'date_bin_timestamp')) return [];

	const { modifiedEndTime, modifiedStartTime, compactType } = getModifiedTimeRange(startTime, endTime, interval);
	const allTimestamps = getAllIntervals(modifiedStartTime, modifiedEndTime, compactType);
	const parsedData = allTimestamps.map((ts) => {
		const countData = records.find((d) => {
			return new Date(`${d.date_bin_timestamp}Z`).toISOString() === ts.toISOString();
		});

		const startTime = dayjs(ts);
		const endTimeByCompactType = incrementDateByCompactType(startTime.toDate(), compactType);
		const endTime = dayjs(endTimeByCompactType);

		const defaultOpts = {
			events: 0,
			minute: ts,
			aboveAvgPercent: 0,
			compactType,
			startTime,
			endTime,
		};

		if (!countData || typeof countData !== 'object') {
			return defaultOpts;
		} else {
			const aboveAvgCount = _.toNumber(countData.log_count) - avg;
			const aboveAvgPercent = parseInt(((aboveAvgCount / avg) * 100).toFixed(2));
			return {
				...defaultOpts,
				events: _.toNumber(countData.log_count),
				aboveAvgPercent,
			};
		}
	});

	return parsedData;
};

function ChartTooltip({ payload }: ChartTooltipProps) {
	if (!payload || (Array.isArray(payload) && payload.length === 0)) return null;

	const { aboveAvgPercent, events, startTime, endTime } = payload[0]?.payload as GraphTickItem;
	const isAboveAvg = aboveAvgPercent > 0;
	const label = makeTimeRangeLabel(startTime.toDate(), endTime.toDate());

	return (
		<Paper px="md" py="sm" withBorder shadow="md" radius="md">
			<Text fw={600} mb={5}>
				{label}
			</Text>
			<Stack style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
				<Text>Events</Text>
				<Text>{events}</Text>
			</Stack>
			<Stack mt={4} style={{ flexDirection: 'row' }}>
				<Text size="sm" c={isAboveAvg ? 'red.6' : 'green.8'}>{`${isAboveAvg ? '+' : ''}${aboveAvgPercent}% ${
					isAboveAvg ? 'above' : 'below'
				} average in the given time-range`}</Text>
			</Stack>
		</Paper>
	);
}

const EventTimeLineGraph = () => {
	const { fetchQueryMutation } = useQueryResult();
	const [currentStream] = useAppStore((store) => store.currentStream);
	const [queryEngine] = useAppStore((store) => store.instanceConfig?.queryEngine);
	const [appliedQuery] = useFilterStore((store) => store.appliedQuery);
	const [{ activeMode, custSearchQuery }, setLogStore] = useLogsStore((store) => store.custQuerySearchState);
	const [{ interval, startTime, endTime }] = useAppStore((store) => store.timeRange);
	const [localStream, setLocalStream] = useState<string | null>('');
	const [{ info }] = useStreamStore((store) => store);
	const firstEventAt = 'first-event-at' in info ? info['first-event-at'] : undefined;

	useEffect(() => {
		setLocalStream(currentStream);
	}, [currentStream]);

	useEffect(() => {
		if (!localStream || localStream.length === 0 || !firstEventAt) return;
		const { modifiedEndTime, modifiedStartTime, compactType } = getModifiedTimeRange(startTime, endTime, interval);

		const logsQuery = {
			streamName: localStream,
			startTime: modifiedStartTime,
			endTime: modifiedEndTime,
			access: [],
		};
		const whereClause =
			activeMode === 'sql'
				? extractWhereClause(custSearchQuery)
				: parseQuery(queryEngine, appliedQuery, localStream).where;
		const query = generateCountQuery(localStream, modifiedStartTime, modifiedEndTime, compactType, whereClause);
		const graphQuery = removeOffsetFromQuery(query);
		fetchQueryMutation.mutate({
			queryEngine: 'Parseable', // query for graph should always hit the endpoint for parseable query
			logsQuery,
			query: graphQuery,
		});
	}, [localStream, startTime.toISOString(), endTime.toISOString(), custSearchQuery, firstEventAt]);

	const isLoading = fetchQueryMutation.isLoading;
	const avgEventCount = useMemo(() => calcAverage(fetchQueryMutation?.data), [fetchQueryMutation?.data]);
	const graphData = useMemo(() => {
		if (!firstEventAt) return null;
		return parseGraphData(fetchQueryMutation?.data, avgEventCount, startTime, endTime, interval);
	}, [fetchQueryMutation?.data, interval, firstEventAt]);
	const hasData = Array.isArray(graphData) && graphData.length !== 0;
	const [, setAppStore] = useAppStore((_store) => null);
	const setTimeRangeFromGraph = useCallback((barValue: any) => {
		const activePayload = barValue?.activePayload;
		if (!Array.isArray(activePayload) || activePayload.length === 0) return;

		const currentPayload = activePayload[0];
		if (!currentPayload || typeof currentPayload !== 'object') return;

		const graphTickItem = currentPayload.payload as GraphTickItem;
		if (!graphTickItem || typeof graphTickItem !== 'object' || _.isEmpty(graphTickItem)) return;

		const { startTime, endTime } = graphTickItem;
		setLogStore((store) => getCleanStoreForRefetch(store));
		setAppStore((store) => setTimeRange(store, { type: 'custom', startTime: startTime, endTime: endTime }));
	}, []);

	return (
		<Stack className={classes.graphContainer}>
			<Skeleton
				visible={fetchQueryMutation.isLoading}
				h="100%"
				w={isLoading ? '98%' : '100%'}
				style={isLoading ? { marginLeft: '1.8rem', alignSelf: 'center' } : !hasData ? { marginLeft: '1rem' } : {}}>
				{hasData ? (
					<AreaChart
						h="100%"
						w="100%"
						data={graphData}
						dataKey="minute"
						series={[{ name: 'events', color: 'indigo.5', label: 'Events' }]}
						tooltipProps={{
							content: ({ label, payload }) => <ChartTooltip label={label} payload={payload} />,
							position: { y: -20 },
						}}
						valueFormatter={(value) => new Intl.NumberFormat('en-US').format(value)}
						withXAxis={false}
						withYAxis={hasData}
						yAxisProps={{ tickCount: 2, tickFormatter: (value) => `${HumanizeNumber(value)}` }}
						referenceLines={[{ y: avgEventCount, color: 'gray.5', label: 'Avg' }]}
						tickLine="none"
						areaChartProps={{ onClick: setTimeRangeFromGraph, style: { cursor: 'pointer' } }}
						gridAxis="xy"
						fillOpacity={0.5}
						strokeWidth={1.25}
						dotProps={{ strokeWidth: 1, r: 2.5 }}
					/>
				) : (
					<NoDataView isError={fetchQueryMutation.isError} />
				)}
			</Skeleton>
		</Stack>
	);
};

export default EventTimeLineGraph;
