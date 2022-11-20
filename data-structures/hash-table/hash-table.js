class HashTable {
	constructor(defaultData, iterableKeys) {
		this.versions = new StoreVersions(this.constructor.name);
		this.historyChanges = new HistoryChanges();
		this.structure = this.#initialization(defaultData, iterableKeys);
	}

	[Symbol.iterator]() {
		return new IteratorKeysAndValues(this.structure);
	}

	get totalVersions () {
		return this.versions.totalVersions;
	}

	#initialization(initData, iterableKeys) {
		const mapArgumentsForHistory = new Map().set(1, initData).set(2, iterableKeys);

		const itemHistory = {
			type: "initializing the data structure",
			nameMethod: "initialization",
			iterable: mapArgumentsForHistory,
			accessModifier: "private",
			currentVersion: this.totalVersions
		};

		this.historyChanges.registerChange(itemHistory);

		const isObject = initData !== null && typeof initData === "object" && !Array.isArray(initData) && !(initData instanceof Map) && !(initData instanceof Set);

		if (isObject && iterableKeys === undefined) {
			const cloneData = clone(initData);

			const nodeHashTable = new NodePersistent(cloneData);

			this.versions.registerVersion(nodeHashTable, this.totalVersions);

			this.versions.totalVersions++;

			return nodeHashTable;
		}

		if (initData === undefined || iterableKeys === undefined) {
			const nodeHashTable = new NodePersistent({});

			this.versions.registerVersion(nodeHashTable, this.totalVersions);

			this.versions.totalVersions++;

			return nodeHashTable;
		}

		const isNotIterable = initData[Symbol.iterator] === undefined || iterableKeys[Symbol.iterator] === undefined;

		if (isNotIterable) {
			throw new Error("Data for initialization with values and an array of keys must be iterable.");
		}

		const source = {};

		const iteratorInitData = initData[Symbol.iterator]();

		const isMap = initData instanceof Map;

		for (const key of iterableKeys) {
			if (!(typeof key === "string")) {
				throw new Error("Key for hashTable must have a string type.");
			}

			const val = iteratorInitData.next().value;

			source[key] = isMap ? val[1] : val;
		}

		const nodeHashTable = new NodePersistent(source);

		this.versions.registerVersion(nodeHashTable, this.totalVersions);

		this.versions.totalVersions++

		return nodeHashTable;
	}

	set(configChange) {
		const isObject = typeof configChange === "object";

		const mapArgumentsForHistory = new Map().set(1, configChange);

		const itemHistory = {
			type: "setting the value",
			nameMethod: "set",
			iterable: mapArgumentsForHistory,
			accessModifier: "public",
			currentVersion: this.totalVersions
		};

		this.historyChanges.registerChange(itemHistory);

		const clone = this.versions.snapshots[this.versions.snapshots.length - 1].value.getClone();

		const cloneLatestVersion = clone.applyListChanges();

		if (isObject && configChange.path !== undefined) {

			cloneLatestVersion.getValueByPath(configChange.path);
		}

		if (this.structure.changeLog.size === this.structure.MAX_CHANGES) {
			this.structure = cloneLatestVersion;

			this.versions.registerVersion(this.structure, this.totalVersions);
		}

		const correctChange = isObject && configChange.path === undefined ?
			({ ...configChange, path: "value" }) :
			isObject && configChange.path !== undefined ?
			configChange : 
			({ value: configChange });

		this.structure.addChange(this.totalVersions, correctChange);

		this.versions.totalVersions++;

		return this.totalVersions;
	}

	get(numberVersion, path) {
		const isNumber = typeof numberVersion === "number";

		const mapArgumentsForHistory = new Map().set(1, numberVersion).set(2, path);

		if (!isNumber || path === undefined || numberVersion < 0 || numberVersion > this.totalVersions - 1) {
			throw new Error(`Operation get() is not available for version - ${numberVersion}. The request must contain a valid path (2 argument). Version should be smaller ${this.totalVersions} and start off 0.`);
		}

		const itemHistory = {
			type: "getting the value",
			nameMethod: "get",
			iterable: mapArgumentsForHistory,
			accessModifier: "public",
			currentVersion: this.totalVersions
		};

		this.historyChanges.registerChange(itemHistory);

		const correctIndex = numberVersion <= 4 ? 0 : Math.floor(numberVersion / 4);

		const clone = this.versions.snapshots[correctIndex].value.getClone().applyListChanges(numberVersion);

		const { value, lastSegment } = clone.getValueByPath(path);

		return value[lastSegment];
	}
}
