class BaseConnector {
  constructor(sourceCode, sourceName) {
    this.sourceCode = sourceCode;
    this.sourceName = sourceName;
  }

  async discoverResources() {
    throw new Error('Not implemented');
  }

  async downloadResource(url) {
    throw new Error('Not implemented');
  }

  async validateResource(buffer) {
    throw new Error('Not implemented');
  }

  async parseResource(buffer) {
    throw new Error('Not implemented');
  }

  async normalizeRecords(rawRecords) {
    throw new Error('Not implemented');
  }

  async syncDatabase(normalizedRecords) {
    throw new Error('Not implemented');
  }

  async getSourceStatus() {
    throw new Error('Not implemented');
  }
}

module.exports = BaseConnector;
