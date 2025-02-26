import { Log } from '@/@types/parseable/api/query';
import { LogStreamData, LogStreamSchemaData } from '@/@types/parseable/api/stream';
import { FIXED_DURATIONS } from '@/constants/timeConstants';
import initContext from '@/utils/initContext';
import { addOrRemoveElement } from '@/utils';
import { getPageSlice } from '../utils';
import _ from 'lodash';
import { sanitizeCSVData } from '@/utils/exportHelpers';
import timeRangeUtils from '@/utils/timeRangeUtils';

export const DEFAULT_FIXED_DURATIONS = FIXED_DURATIONS[0];
export const LOG_QUERY_LIMITS = [50, 100, 150, 200];
export const LOAD_LIMIT = 1000;
export const columnsToSkip = ['p_metadata', 'p_tags'];

type ReducerOutput = Partial<LogsStore>;

export type ViewMode = 'table' | 'json';

export type ConfigType = {
	column: string;
	operator: string;
	value: string | number;
	repeats: number;
	ignore_case?: boolean;
};

export interface RuleConfig {
	type: string;
	config: ConfigType | string;
}

export interface Target {
	type: string;
	endpoint: string;
	username?: string;
	password?: string;
	headers?: Record<string, string>;
	skip_tls_check: boolean;
	repeat: {
		interval: string;
		times: number;
	};
}

export interface TransformedTarget {
	type: string;
	endpoint: string;
	username?: string;
	password?: string;
	headers?: Record<string, string>[];
	skip_tls_check: boolean;
	repeat: {
		interval: string;
		times: number;
	};
}

export interface Alert {
	name: string;
	message: string;
	rule: RuleConfig;
	targets: Target[];
}

export interface TransformedAlert {
	name: string;
	message: string;
	rule: RuleConfig;
	targets: TransformedTarget[];
}

export interface AlertsResponse {
	version: string;
	alerts: Alert[];
}

export type TransformedAlerts = {
	version: string;
	alerts: TransformedAlert[];
};

enum SortOrder {
	ASCENDING = 1,
	DESCENDING = -1,
}

type QuickFilters = {
	search: string;
	filters: Record<string, string[]>;
	sort: {
		key: string;
		order: SortOrder;
	};
};

type LiveTailStatus = 'streaming' | 'stopped' | 'abort' | 'fetch' | '';

type LiveTailConfig = {
	liveTailStatus: LiveTailStatus;
	liveTailSchemaData: LogStreamData;
	liveTailSearchValue: string;
	liveTailSearchField: string;
	showLiveTail: boolean;
};
export const formatLogTs = (timestamp: string) => {
	if (!_.endsWith(timestamp, 'Z')) {
		return timeRangeUtils.formatDateWithTimezone(`${timestamp}Z`, 'yyyy-MM-DDTHH:mm:ss.SSSZ');
	} else {
		return timeRangeUtils.formatDateWithTimezone(timestamp, 'yyyy-MM-DDTHH:mm:ss.SSSZ');
	}
};

const defaultQuickFilters = {
	search: '',
	filters: {},
	sort: {
		key: 'p_timestamp',
		order: SortOrder.DESCENDING,
	},
};

const defaultLiveTailConfig = {
	liveTailStatus: '' as const,
	liveTailSchemaData: [],
	liveTailSearchValue: '',
	liveTailSearchField: '',
	showLiveTail: false,
	grpcPort: null,
};

const defaultCustQuerySearchState = {
	showQueryBuilder: false,
	isQuerySearchActive: false,
	custSearchQuery: '',
	viewMode: 'filters',
	activeMode: null,
	savedFilterId: null,
};

type LogQueryData = {
	rawData: Log[];
	filteredData: Log[];
};

type CustQuerySearchState = {
	showQueryBuilder: boolean;
	isQuerySearchActive: boolean;
	custSearchQuery: string;
	viewMode: string;
	activeMode: null | 'filters' | 'sql';
	savedFilterId: string | null;
};

type LogsStore = {
	quickFilters: QuickFilters;
	liveTailConfig: LiveTailConfig;
	refreshInterval: number | null;
	selectedLog: Log | null;
	custQuerySearchState: CustQuerySearchState;
	sideBarOpen: boolean;
	viewMode: ViewMode;

	modalOpts: {
		deleteModalOpen: boolean;
		alertsModalOpen: boolean;
		retentionModalOpen: boolean;
		queryBuilderModalOpen: boolean;
	};

	tableOpts: {
		disabledColumns: string[];
		wrapDisabledColumns: string[];
		targetColumns: string[];
		pinnedColumns: string[];
		pageData: Log[];
		totalPages: number;
		totalCount: number;
		displayedCount: number;
		currentPage: number;
		targetPage: number | undefined;
		perPage: number;
		currentOffset: number;
		headers: string[];
		orderedHeaders: string[];
		sortKey: string;
		sortOrder: 'asc' | 'desc';
		filters: Record<string, string[]>;
		instantSearchValue: string;
		configViewType: 'schema' | 'columns';
		enableWordWrap: boolean;
		rowNumber: string;
	};

	data: LogQueryData;

	retention: {
		action: 'delete';
		duration: number;
		description: string;
	};

	alerts: TransformedAlerts;
};

type LogsStoreReducers = {
	deleteFilterItem: (store: LogsStore, key: string) => ReducerOutput;
	addFilterItem: (store: LogsStore, key: string, value: string[]) => ReducerOutput;
	setLiveTailStatus: (store: LogsStore, liveTailStatus: LiveTailStatus) => ReducerOutput;
	resetLiveTailSearchState: (store: LogsStore) => ReducerOutput;
	setLiveTailSchema: (store: LogsStore, liveTailSchemaData: LogStreamData) => ReducerOutput;
	setRefreshInterval: (store: LogsStore, interval: number | null) => ReducerOutput;
	resetQuickFilters: (store: LogsStore) => ReducerOutput;
	streamChangeCleanup: (store: LogsStore) => ReducerOutput;
	toggleQueryBuilder: (store: LogsStore, val?: boolean) => ReducerOutput;
	setCustQuerySearchState: (store: LogsStore, query: string, viewMode: string) => ReducerOutput;
	resetCustQuerySearchState: (store: LogsStore) => ReducerOutput;
	toggleCustQuerySearchViewMode: (store: LogsStore, targetMode: 'sql' | 'filters') => ReducerOutput;
	toggleDeleteModal: (store: LogsStore, val?: boolean) => ReducerOutput;
	toggleAlertsModal: (store: LogsStore, val?: boolean) => ReducerOutput;
	toggleRetentionModal: (store: LogsStore, val?: boolean) => ReducerOutput;
	toggleLiveTail: (store: LogsStore) => ReducerOutput;
	setSelectedLog: (store: LogsStore, log: Log | null) => ReducerOutput;
	toggleSideBar: (store: LogsStore) => ReducerOutput;

	// table opts reducers
	toggleDisabledColumns: (store: LogsStore, columnName: string) => ReducerOutput;
	toggleWrapDisabledColumns: (store: LogsStore, columnName: string) => ReducerOutput;
	togglePinnedColumns: (store: LogsStore, columnName: string) => ReducerOutput;
	setCurrentOffset: (store: LogsStore, offset: number) => ReducerOutput;
	setPerPage: (store: LogsStore, perPage: number) => ReducerOutput;
	setCurrentPage: (store: LogsStore, page: number) => ReducerOutput;
	setTargetPage: (store: LogsStore, target: number | undefined) => ReducerOutput;
	setTotalCount: (store: LogsStore, totalCount: number) => ReducerOutput;
	setPageAndPageData: (store: LogsStore, pageNo: number, perPage?: number) => ReducerOutput;
	setAndSortData: (store: LogsStore, sortKey: string, sortOrder: 'asc' | 'desc') => ReducerOutput;
	setAndFilterData: (store: LogsStore, filterKey: string, filterValues: string[], remove?: boolean) => ReducerOutput;
	getCleanStoreForRefetch: (store: LogsStore) => ReducerOutput;

	// data reducers
	setLogData: (store: LogsStore, data: Log[], headers: string[], jqFilteredData?: Log[]) => ReducerOutput;
	setStreamSchema: (store: LogsStore, schema: LogStreamSchemaData) => ReducerOutput;
	applyCustomQuery: (store: LogsStore, query: string, mode: 'filters' | 'sql', savedFilterId?: string) => ReducerOutput;
	getUniqueValues: (data: Log[], key: string) => string[];
	makeExportData: (data: Log[], headers: string[], type: string) => Log[];
	setRetention: (store: LogsStore, retention: { description: string; duration: string }) => ReducerOutput;

	setCleanStoreForStreamChange: (store: LogsStore) => ReducerOutput;
	updateSavedFilterId: (store: LogsStore, savedFilterId: string | null) => ReducerOutput;
	setInstantSearchValue: (store: LogsStore, value: string) => ReducerOutput;
	applyInstantSearch: (store: LogsStore) => ReducerOutput;
	applyJqSearch: (store: LogsStore, jqFilteredData: any[]) => ReducerOutput;
	onToggleView: (store: LogsStore, viewMode: 'json' | 'table') => ReducerOutput;
	toggleConfigViewType: (store: LogsStore) => ReducerOutput;
	setDisabledColumns: (store: LogsStore, columns: string[]) => ReducerOutput;
	setTargetColumns: (store: LogsStore, columms: string[]) => ReducerOutput;
	setOrderedHeaders: (store: LogsStore, columns: string[]) => ReducerOutput;
	toggleWordWrap: (store: LogsStore) => ReducerOutput;
	setRowNumber: (store: LogsStore, rowNumber: string) => ReducerOutput;
};

const defaultSortKey = 'p_timestamp';
const defaultSortOrder = 'desc' as const;

const initialState: LogsStore = {
	quickFilters: defaultQuickFilters,
	liveTailConfig: defaultLiveTailConfig,
	refreshInterval: null,
	selectedLog: null,
	custQuerySearchState: defaultCustQuerySearchState,
	sideBarOpen: false,
	viewMode: 'json',
	modalOpts: {
		deleteModalOpen: false,
		alertsModalOpen: false,
		retentionModalOpen: false,
		queryBuilderModalOpen: false,
	},

	tableOpts: {
		targetColumns: [],
		disabledColumns: [],
		wrapDisabledColumns: [],
		pinnedColumns: [],
		pageData: [],
		perPage: 50,
		totalCount: 0,
		displayedCount: 0,
		totalPages: 0,
		currentPage: 0,
		targetPage: undefined,
		currentOffset: 0,
		headers: [],
		orderedHeaders: [],
		sortKey: defaultSortKey,
		sortOrder: defaultSortOrder,
		filters: {},
		instantSearchValue: '',
		configViewType: 'columns',
		enableWordWrap: true,
		rowNumber: '',
	},

	// data
	data: {
		rawData: [],
		filteredData: [],
	},

	retention: {
		action: 'delete',
		description: '',
		duration: 0,
	},

	alerts: {
		version: '',
		alerts: [],
	},
	// if adding new fields, verify streamChangeCleanup
};

const { Provider: LogsProvider, useStore: useLogsStore } = initContext(initialState);

const getTotalPages = (data: Log[], perPage: number) => {
	return _.isEmpty(data) ? 0 : Math.ceil(_.size(data) / perPage);
};

const setSelectedLog = (_store: LogsStore, log: Log | null) => {
	return { selectedLog: log };
};

// reducers
const deleteFilterItem = (store: LogsStore, key: string) => {
	const filters = store.quickFilters.filters;
	const updatedFilters = (({ [key]: _, ...filters }) => filters)(filters);
	return { quickFilters: { ...store.quickFilters, filters: updatedFilters } };
};

const addFilterItem = (store: LogsStore, key: string, value: string[]) => {
	const filters = store.quickFilters.filters;
	const updatedFilters = { ...filters, [key]: value };
	return { quickFilters: { ...store.quickFilters, filters: updatedFilters } };
};

const resetQuickFilters = (_store: LogsStore) => {
	return { quickFilters: defaultQuickFilters };
};

const setInstantSearchValue = (store: LogsStore, value: string) => {
	return { tableOpts: { ...store.tableOpts, instantSearchValue: value } };
};

const setLiveTailStatus = (store: LogsStore, liveTailStatus: LiveTailStatus) => {
	const { liveTailConfig } = store;
	return { liveTailConfig: { ...liveTailConfig, liveTailStatus } };
};

const resetLiveTailSearchState = (store: LogsStore) => {
	return { liveTailConfig: { ...store.liveTailConfig, liveTailSearchValue: '', liveTailSearchField: '' } };
};

const setLiveTailSchema = (store: LogsStore, liveTailSchemaData: LogStreamData) => {
	return { liveTailConfig: { ...store.liveTailConfig, liveTailSchemaData } };
};

const toggleLiveTail = (store: LogsStore) => {
	return { liveTailConfig: { ...defaultLiveTailConfig, showLiveTail: !store.liveTailConfig.showLiveTail } };
};

const setRefreshInterval = (_store: LogsStore, interval: number | null) => {
	return { refreshInterval: interval };
};

const streamChangeCleanup = (_store: LogsStore) => {
	return { ...initialState };
};

const toggleQueryBuilder = (store: LogsStore, val?: boolean) => {
	const { custQuerySearchState } = store;
	return {
		custQuerySearchState: {
			...custQuerySearchState,
			showQueryBuilder: _.isBoolean(val) ? val : !custQuerySearchState.showQueryBuilder,
		},
	};
};

const setCustQuerySearchState = (store: LogsStore, query: string, viewMode: string) => {
	return {
		custQuerySearchState: {
			showQueryBuilder: false,
			savedFilterId: null,
			isQuerySearchActive: true,
			custSearchQuery: query,
			viewMode,
			activeMode: viewMode === 'filters' ? ('filters' as const) : ('sql' as const),
		},
		...getCleanStoreForRefetch(store),
	};
};

const resetCustQuerySearchState = (store: LogsStore) => {
	const { custQuerySearchState } = store;
	return {
		custQuerySearchState: { ...defaultCustQuerySearchState, viewMode: custQuerySearchState.viewMode },
		...getCleanStoreForRefetch(store),
	};
};

const toggleCustQuerySearchViewMode = (store: LogsStore, targetMode: 'filters' | 'sql') => {
	const { custQuerySearchState } = store;

	return {
		custQuerySearchState: { ...custQuerySearchState, viewMode: targetMode },
	};
};

const toggleDeleteModal = (store: LogsStore, val?: boolean) => {
	const { modalOpts } = store;
	return { modalOpts: { ...modalOpts, deleteModalOpen: _.isBoolean(val) ? val : !modalOpts.deleteModalOpen } };
};

const toggleRetentionModal = (store: LogsStore, val?: boolean) => {
	const { modalOpts } = store;
	return { modalOpts: { ...modalOpts, retentionModalOpen: _.isBoolean(val) ? val : !modalOpts.retentionModalOpen } };
};

const toggleAlertsModal = (store: LogsStore, val?: boolean) => {
	const { modalOpts } = store;
	return { modalOpts: { ...modalOpts, alertsModalOpen: _.isBoolean(val) ? val : !modalOpts.alertsModalOpen } };
};

const toggleDisabledColumns = (store: LogsStore, columnName: string) => {
	const { tableOpts } = store;
	return {
		tableOpts: {
			...tableOpts,
			disabledColumns: addOrRemoveElement(tableOpts.disabledColumns, columnName),
		},
	};
};

const toggleWrapDisabledColumns = (store: LogsStore, columnName: string) => {
	const { tableOpts } = store;
	return {
		tableOpts: {
			...tableOpts,
			wrapDisabledColumns: addOrRemoveElement(tableOpts.wrapDisabledColumns, columnName),
		},
	};
};

const setDisabledColumns = (store: LogsStore, columns: string[]) => {
	return {
		tableOpts: {
			...store.tableOpts,
			disabledColumns: columns,
		},
	};
};

const setTargetColumns = (store: LogsStore, columns: string[]) => {
	return {
		tableOpts: {
			...store.tableOpts,
			targetColumns: columns,
		},
	};
};

const togglePinnedColumns = (store: LogsStore, columnName: string) => {
	const { tableOpts } = store;
	return {
		tableOpts: {
			...tableOpts,
			pinnedColumns: addOrRemoveElement(tableOpts.pinnedColumns, columnName),
		},
	};
};

const setRowNumber = (store: LogsStore, rowNumber: string) => {
	const { tableOpts } = store;
	return {
		tableOpts: {
			...tableOpts,
			rowNumber,
		},
	};
};

const filterAndSortData = (
	opts: { sortOrder: 'asc' | 'desc'; sortKey: string; filters: Record<string, string[]> },
	data: Log[],
) => {
	const { sortOrder, sortKey, filters } = opts;
	const filterSets = _.mapValues(filters, (values) => new Set(values));
	const filteredData = _.isEmpty(filters)
		? data
		: _.filter(data, (item) => _.every(filterSets, (valueSet, key) => valueSet.has(_.toString(item[key]))));
	const sortedData = _.orderBy(filteredData, [sortKey], [sortOrder]);
	return sortedData;
};

const searchAndSortData = (opts: { searchValue: string }, data: Log[]) => {
	const { searchValue } = opts;
	const filteredData = _.isEmpty(searchValue)
		? data
		: (_.reduce(
				data,
				(acc: Log[], d: Log) => {
					const allValues = _.chain(d)
						.entries()
						.map(([key, value]) => [key, _.toString(value)])
						.value();

					const doesMatch = _.some(
						allValues,
						([key, value]) => key.includes(searchValue) || value.includes(searchValue),
					);

					return doesMatch ? [...acc, d] : acc;
				},
				[],
		  ) as Log[]);
	const sortedData = _.orderBy(filteredData, [defaultSortKey], [defaultSortOrder]);
	return sortedData;
};

export const isJqSearch = (value: string) => {
	return _.startsWith(value, 'jq .');
};

const setLogData = (store: LogsStore, data: Log[], headers: string[], jqFilteredData?: Log[]) => {
	const { data: existingData, tableOpts, viewMode } = store;
	const { orderedHeaders } = tableOpts;
	const isJsonView = viewMode === 'json';
	const currentPage = 1;
	const filteredData =
		isJsonView && !_.isEmpty(tableOpts.instantSearchValue)
			? isJqSearch(tableOpts.instantSearchValue)
				? jqFilteredData || []
				: searchAndSortData({ searchValue: tableOpts.instantSearchValue }, data)
			: filterAndSortData(tableOpts, data);
	const newPageSlice = filteredData && getPageSlice(currentPage, tableOpts.perPage, filteredData);
	const unknownHeaders = _.difference(headers, orderedHeaders);
	const updatedOrderedHeaders = _.chain([...orderedHeaders, ...unknownHeaders])
		.uniq()
		.without(...columnsToSkip)
		.value();
	return {
		tableOpts: {
			...store.tableOpts,
			...(newPageSlice ? { pageData: newPageSlice } : {}),
			headers,
			currentPage,
			totalPages: getTotalPages(filteredData, tableOpts.perPage),
			orderedHeaders: updatedOrderedHeaders,
		},
		data: { ...existingData, rawData: data, filteredData: filteredData },
	};
};

const setStreamSchema = (store: LogsStore, schema: LogStreamSchemaData) => {
	return {
		data: {
			...store.data,
			schema,
		},
	};
};

const setPerPage = (store: LogsStore, perPage: number) => {
	return {
		tableOpts: {
			...store.tableOpts,
			perPage,
		},
	};
};

const setTargetPage = (store: LogsStore, target: number | undefined) => {
	return {
		tableOpts: {
			...store.tableOpts,
			targetPage: target ? target : undefined,
		},
	};
};

const setCurrentPage = (store: LogsStore, currentPage: number) => {
	return {
		tableOpts: {
			...store.tableOpts,
			currentPage,
		},
	};
};

const setCurrentOffset = (store: LogsStore, currentOffset: number) => {
	return {
		tableOpts: {
			...store.tableOpts,
			currentOffset,
		},
	};
};

const setTotalCount = (store: LogsStore, totalCount: number) => {
	return {
		tableOpts: {
			...store.tableOpts,
			totalCount,
		},
	};
};

const setPageAndPageData = (store: LogsStore, pageNo: number, perPage?: number) => {
	const {
		data: { filteredData },
		tableOpts,
	} = store;
	const updatedPerPage = perPage || tableOpts.perPage;
	const newPageSlice = filteredData && getPageSlice(pageNo, updatedPerPage, filteredData);

	return {
		tableOpts: {
			...store.tableOpts,
			pageData: newPageSlice,
			currentPage: pageNo,
			totalPages: getTotalPages(filteredData, updatedPerPage),
			perPage: updatedPerPage,
		},
	};
};

const getCleanStoreForRefetch = (store: LogsStore) => {
	const { tableOpts, data } = store;
	return {
		tableOpts: {
			...tableOpts,
			pageData: [],
			totalCount: 0,
			displayedCount: 0,
			currentPage: 0,
			currentOffset: 0,
			totalPages: 0,
			orderedHeaders: [],
		},
		data: {
			...data,
			filteredData: [],
			rawData: [],
		},
	};
};

const setCleanStoreForStreamChange = (store: LogsStore) => {
	const { tableOpts, alerts } = store;
	return {
		...initialState,
		tableOpts: {
			...tableOpts,
			pageData: [],
			totalCount: 0,
			displayedCount: 0,
			currentPage: 0,
			currentOffset: 0,
			totalPages: 0,
			orderedHeaders: [],
			disabledColumns: [],
			wrapDisabledColumns: [],
			pinnedColumns: [],
			filters: {},
		},
		alerts,
	};
};

const applyCustomQuery = (store: LogsStore, query: string, mode: 'filters' | 'sql', savedFilterId?: string) => {
	const { custQuerySearchState } = store;

	return {
		custQuerySearchState: {
			...custQuerySearchState,
			showQueryBuilder: false,
			isQuerySearchActive: true,
			custSearchQuery: query,
			activeMode: mode,
			savedFilterId: savedFilterId || null,
			viewMode: mode,
		},
		...getCleanStoreForRefetch(store),
	};
};

const updateSavedFilterId = (store: LogsStore, savedFilterId: string | null) => {
	const { custQuerySearchState } = store;
	return {
		custQuerySearchState: {
			...custQuerySearchState,
			savedFilterId,
		},
	};
};

const setAndSortData = (store: LogsStore, sortKey: string, sortOrder: 'asc' | 'desc') => {
	const { data, tableOpts } = store;
	const filteredData = filterAndSortData({ sortKey, sortOrder, filters: tableOpts.filters }, data.rawData);
	const currentPage = 1;
	const newPageSlice = getPageSlice(currentPage, tableOpts.perPage, filteredData);

	return {
		data: {
			...data,
			filteredData,
		},
		tableOpts: {
			...tableOpts,
			sortKey,
			sortOrder,
			pageData: newPageSlice,
			currentPage,
			totalPages: getTotalPages(filteredData, tableOpts.perPage),
		},
	};
};

const setAndFilterData = (store: LogsStore, filterKey: string, filterValues: string[], remove = false) => {
	const { data, tableOpts } = store;
	const { sortKey, sortOrder, filters } = tableOpts;
	const updatedFilters = remove ? _.omit(filters, filterKey) : { ...filters, [filterKey]: filterValues };
	const filteredData = filterAndSortData({ sortOrder, sortKey, filters: updatedFilters }, data.rawData);
	const currentPage = 1;
	const newPageSlice = getPageSlice(currentPage, tableOpts.perPage, filteredData);

	return {
		data: {
			...data,
			filteredData,
		},
		tableOpts: {
			...tableOpts,
			filters: updatedFilters,
			pageData: newPageSlice,
			currentPage,
			totalPages: getTotalPages(filteredData, tableOpts.perPage),
		},
	};
};

const applyInstantSearch = (store: LogsStore) => {
	const { data, tableOpts } = store;
	const { instantSearchValue: searchValue } = tableOpts;
	const filteredData = searchAndSortData({ searchValue }, data.rawData);
	const currentPage = 1;
	const newPageSlice = getPageSlice(currentPage, tableOpts.perPage, filteredData);

	return {
		data: {
			...data,
			filteredData,
		},
		tableOpts: {
			...tableOpts,
			filters: {},
			pageData: newPageSlice,
			currentPage,
			totalPages: getTotalPages(filteredData, tableOpts.perPage),
		},
	};
};

const applyJqSearch = (store: LogsStore, jqFilteredData: any[]) => {
	const { data, tableOpts } = store;
	const currentPage = 1;
	const newPageSlice = getPageSlice(currentPage, tableOpts.perPage, jqFilteredData);

	return {
		data: {
			...data,
			filteredData: jqFilteredData,
		},
		tableOpts: {
			...tableOpts,
			filters: {},
			pageData: newPageSlice,
			currentPage,
			totalPages: getTotalPages(jqFilteredData, tableOpts.perPage),
		},
	};
};

const getUniqueValues = (data: Log[], key: string) => {
	return _.chain(data)
		.map(key)
		.compact()
		.uniq()
		.map((v) => _.toString(v))
		.value();
};

export const makeExportData = (data: Log[], headers: string[], type: string): Log[] => {
	if (type === 'JSON') {
		return data;
	} else if (type === 'CSV') {
		const sanitizedCSVData = sanitizeCSVData(data, headers);
		return [headers, ...sanitizedCSVData];
	} else {
		return [];
	}
};

const setRetention = (_store: LogsStore, retention: { duration?: string; description?: string }) => {
	const durationInNumber = _.isString(retention.duration)
		? _.chain(retention.duration).split('d').head().toInteger().value()
		: 0;
	return {
		retention: {
			duration: durationInNumber,
			description: retention.description || '',
			action: 'delete' as const,
		},
	};
};

const toggleSideBar = (store: LogsStore) => {
	return {
		sideBarOpen: !store.sideBarOpen,
	};
};

const onToggleView = (store: LogsStore, viewMode: 'json' | 'table') => {
	const { data, tableOpts } = store;
	const filteredData = filterAndSortData(
		{ sortOrder: defaultSortOrder, sortKey: defaultSortKey, filters: {} },
		data.rawData,
	);
	const currentPage = tableOpts.currentPage;
	const newPageSlice = getPageSlice(currentPage, tableOpts.perPage, filteredData);

	return {
		data: {
			...data,
			filteredData,
		},
		tableOpts: {
			...tableOpts,
			filters: {},
			pageData: newPageSlice,
			instantSearchValue: '',
			currentPage,
			totalPages: getTotalPages(filteredData, tableOpts.perPage),
		},
		viewMode,
	};
};

const toggleConfigViewType = (store: LogsStore) => {
	const configViewType: 'columns' | 'schema' = store.tableOpts.configViewType === 'schema' ? 'columns' : 'schema';

	return {
		tableOpts: {
			...store.tableOpts,
			configViewType,
		},
	};
};

const setOrderedHeaders = (store: LogsStore, headers: string[]) => {
	return {
		tableOpts: {
			...store.tableOpts,
			orderedHeaders: headers,
		},
	};
};

const toggleWordWrap = (store: LogsStore) => {
	return {
		tableOpts: {
			...store.tableOpts,
			enableWordWrap: !store.tableOpts.enableWordWrap,
		},
	};
};

const logsStoreReducers: LogsStoreReducers = {
	deleteFilterItem,
	addFilterItem,
	setLiveTailStatus,
	resetLiveTailSearchState,
	setLiveTailSchema,
	setRefreshInterval,
	resetQuickFilters,
	streamChangeCleanup,
	toggleQueryBuilder,
	resetCustQuerySearchState,
	toggleCustQuerySearchViewMode,
	toggleAlertsModal,
	toggleRetentionModal,
	toggleDeleteModal,
	toggleDisabledColumns,
	togglePinnedColumns,
	setRowNumber,
	setLogData,
	setStreamSchema,
	setPerPage,
	setCurrentPage,
	setTargetPage,
	setCurrentOffset,
	setTotalCount,
	setPageAndPageData,
	applyCustomQuery,
	setAndSortData,
	getUniqueValues,
	setAndFilterData,
	getCleanStoreForRefetch,
	toggleLiveTail,
	setSelectedLog,
	makeExportData,
	setRetention,
	setCleanStoreForStreamChange,
	toggleSideBar,
	updateSavedFilterId,
	setInstantSearchValue,
	applyInstantSearch,
	applyJqSearch,
	onToggleView,
	toggleConfigViewType,
	setDisabledColumns,
	setTargetColumns,
	setOrderedHeaders,
	toggleWordWrap,
	toggleWrapDisabledColumns,
	setCustQuerySearchState,
};

export { LogsProvider, useLogsStore, logsStoreReducers };
