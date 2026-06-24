import React, { useState, useEffect } from 'react';
import { useAlert } from '../../../context/AlertContext';
import { API_BASE_URL } from '../../../config';
import { 
  Database, Search, Plus, Edit, Trash2, Play, RefreshCw, 
  Code, AlertTriangle, ChevronLeft, ChevronRight, Info, Eye, Check, X
} from 'lucide-react';
import './AdminDatabaseManager.css';
import './AdminPages.css';

const AdminDatabaseManager = () => {
  const { showAlert } = useAlert();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [activeTab, setActiveTab] = useState('data'); // 'data', 'schema', 'query', 'actions'
  
  // Data explorer state
  const [rows, setRows] = useState([]);
  const [schema, setSchema] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [rowSearch, setRowSearch] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState([]);


  // Custom Query state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 10;');
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState('');
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);

  // CRUD Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit'
  const [activeRowId, setActiveRowId] = useState(null);
  const [formData, setFormData] = useState({});

  // Seed Reset verification
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Fetch Tables
  const fetchTables = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/db/tables`);
      if (res.ok) {
        const data = await res.json();
        setTables(data);
        if (data.length > 0 && !selectedTable) {
          setSelectedTable(data[0].name);
        }
      } else {
        showAlert('Failed to fetch system tables.', 'error');
      }
    } catch (error) {
      console.error(error);
      showAlert('Error listing database tables.', 'error');
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // Fetch Table Data & Schema when Table, Page, limit, Search, Sort changes
  const fetchTableData = async () => {
    if (!selectedTable) return;
    setIsLoading(true);
    try {
      // 1. Fetch Schema
      const schemaRes = await fetch(`${API_BASE_URL}/api/admin/db/tables/${selectedTable}/schema`);
      let cols = [];
      if (schemaRes.ok) {
        cols = await schemaRes.json();
        setSchema(cols);
      }

      // Determine default sorting field
      const hasId = cols.some(c => c.Field === 'id');
      const hasCreatedAt = cols.some(c => c.Field === 'created_at');
      const defaultSort = hasId ? 'id' : (hasCreatedAt ? 'created_at' : (cols[0]?.Field || ''));

      // Update sort state if table changed
      let currentSortBy = sortBy;
      if (!cols.some(c => c.Field === sortBy)) {
        setSortBy(defaultSort);
        currentSortBy = defaultSort;
      }

      // 2. Fetch Rows
      const rowsRes = await fetch(
        `${API_BASE_URL}/api/admin/db/tables/${selectedTable}/rows?page=${page}&limit=${limit}&search=${encodeURIComponent(rowSearch)}&sortBy=${currentSortBy}&sortOrder=${sortOrder}`
      );
      if (rowsRes.ok) {
        const rowsData = await rowsRes.json();
        setRows(rowsData.rows);
        setTotalRows(rowsData.total);
      }
    } catch (error) {
      console.error(error);
      showAlert('Error loading table contents.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      setPage(1);
      fetchTableData();
    }
  }, [selectedTable]);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
  }, [page, limit, sortOrder]);

  // Clear checkboxes on table, page, search, sort changes
  useEffect(() => {
    setSelectedRowIds([]);
  }, [selectedTable, page, limit, rowSearch, sortBy, sortOrder]);


  const handleRowSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTableData();
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const getRowPrimaryKey = (row) => {
    if (!row) return null;
    return row.id !== undefined ? row.id : (row.user_id !== undefined ? row.user_id : Object.values(row)[0]);
  };

  // Delete Row
  const handleDeleteRow = async (id) => {
    if (!window.confirm(`Are you sure you want to delete row ID ${id} from table "${selectedTable}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/db/tables/${selectedTable}/rows/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showAlert('Row deleted successfully!', 'success');
        fetchTableData();
        fetchTables(); // Refresh counts
      } else {
        const err = await res.json();
        showAlert(err.error || 'Failed to delete row', 'error');
      }
    } catch (error) {
      console.error(error);
      showAlert('Error performing row deletion', 'error');
    }
  };

  // Bulk Delete Selected Rows
  const handleBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete the ${selectedRowIds.length} selected rows from table "${selectedTable}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/db/tables/${selectedTable}/delete-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedRowIds })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(data.message || 'Selected records deleted successfully!', 'success');
        setSelectedRowIds([]);
        fetchTableData();
        fetchTables(); // Refresh counts
      } else {
        showAlert(data.error || 'Failed to delete selected rows', 'error');
      }
    } catch (error) {
      console.error(error);
      showAlert('Error performing bulk row deletion', 'error');
    }
  };

  const handleToggleRowSelect = (rowId) => {
    setSelectedRowIds(prev => 
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };

  const handleToggleSelectAll = () => {
    const allVisibleIds = rows.map(row => getRowPrimaryKey(row));
    const allSelected = allVisibleIds.every(id => selectedRowIds.includes(id));
    
    if (allSelected) {
      setSelectedRowIds(prev => prev.filter(id => !allVisibleIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedRowIds, ...allVisibleIds]));
      setSelectedRowIds(combined);
    }
  };

  // Open Edit Modal
  const openEditModal = (row) => {
    setModalMode('edit');
    setActiveRowId(getRowPrimaryKey(row)); // Primary key matching
    
    // Copy row values to form state
    const formatted = {};
    schema.forEach(col => {
      formatted[col.Field] = row[col.Field] !== null ? row[col.Field] : '';
    });
    setFormData(formatted);
    setIsModalOpen(true);
  };


  // Open Add Modal
  const openAddModal = () => {
    setModalMode('add');
    setActiveRowId(null);
    const defaults = {};
    schema.forEach(col => {
      // Set empty values or default database values
      defaults[col.Field] = col.Default !== null ? col.Default : '';
    });
    setFormData(defaults);
    setIsModalOpen(true);
  };

  // Handle Input Changes inside Modal Editor
  const handleInputChange = (field, value, type) => {
    setFormData(prev => ({
      ...prev,
      [field]: type === 'checkbox' ? (value ? 1 : 0) : value
    }));
  };

  // Submit Modal Row Save
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const url = modalMode === 'add' 
      ? `${API_BASE_URL}/api/admin/db/tables/${selectedTable}/rows`
      : `${API_BASE_URL}/api/admin/db/tables/${selectedTable}/rows/${activeRowId}`;
    
    const method = modalMode === 'add' ? 'POST' : 'PUT';

    // Format fields before submission (e.g. check for null inputs)
    const payload = {};
    Object.keys(formData).forEach(key => {
      if (key === 'id' && modalMode === 'add') return; // Strip out id on add
      
      const colDef = schema.find(c => c.Field === key);
      const isNullable = colDef?.Null === 'YES';
      const rawVal = formData[key];

      if (rawVal === '' && isNullable) {
        payload[key] = null;
      } else if (rawVal === '') {
        // If empty string but not nullable, default to type-safe empty defaults
        const type = colDef?.Type.toLowerCase() || '';
        if (type.includes('int') || type.includes('decimal')) {
          payload[key] = 0;
        } else {
          payload[key] = '';
        }
      } else {
        payload[key] = rawVal;
      }
    });

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(data.message || 'Row saved successfully!', 'success');
        setIsModalOpen(false);
        fetchTableData();
        fetchTables(); // Refresh counts
      } else {
        showAlert(data.error || 'Failed to save row changes', 'error');
      }
    } catch (error) {
      console.error(error);
      showAlert('Error occurred while saving row details.', 'error');
    }
  };

  // Execute Custom Query
  const handleExecuteQuery = async (e) => {
    e.preventDefault();
    if (!sqlQuery.trim()) return;
    setIsExecutingQuery(true);
    setQueryError('');
    setQueryResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setQueryResult(data.results);
        showAlert('Query executed successfully!', 'success');
        fetchTables(); // Refresh in case table structures/counts changed
      } else {
        setQueryError(data.error || 'Query execution error');
      }
    } catch (error) {
      console.error(error);
      setQueryError('Network error executing SQL command.');
    } finally {
      setIsExecutingQuery(false);
    }
  };

  // Reset and Re-seed DB
  const handleDatabaseReset = async () => {
    if (resetConfirmWord !== 'RESET') {
      return showAlert('Confirmation word does not match.', 'error');
    }

    setIsResetting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/db/reset`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(data.message || 'Database reset successfully!', 'success');
        setResetConfirmWord('');
        setShowResetConfirm(false);
        fetchTables();
        if (selectedTable) fetchTableData();
      } else {
        showAlert(data.error || 'Failed to seed database', 'error');
      }
    } catch (error) {
      console.error(error);
      showAlert('Error executing seed reset', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Dynamic input compiler for Modal form
  const renderFieldInput = (col) => {
    const isId = col.Field === 'id';
    const type = col.Type.toLowerCase();
    const val = formData[col.Field] !== undefined ? formData[col.Field] : '';

    if (isId && modalMode === 'edit') {
      return (
        <input 
          type="text" 
          disabled 
          className="composer-input" 
          value={val} 
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        />
      );
    }

    // TINYINT or Boolean
    if (type.includes('tinyint')) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
          <input 
            type="checkbox"
            id={`chk-${col.Field}`}
            className="db-checkbox"
            checked={val === 1 || val === true || val === '1'}
            onChange={(e) => handleInputChange(col.Field, e.target.checked ? 1 : 0, 'checkbox')}
          />
          <label htmlFor={`chk-${col.Field}`} className="db-checkbox-label">
            True / Enabled (1)
          </label>
        </div>
      );
    }

    // TEXT / LONGTEXT fields
    if (type.includes('text') || type.includes('blob') || col.Field === 'message' || col.Field.includes('coords') || col.Field === 'file_path') {
      return (
        <textarea 
          className="composer-input" 
          style={{ height: '90px', resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
          placeholder={`Enter data for ${col.Field}...`}
          value={val}
          onChange={(e) => handleInputChange(col.Field, e.target.value, 'text')}
        />
      );
    }

    // Number Inputs
    if (type.includes('int') || type.includes('decimal') || type.includes('float') || type.includes('double')) {
      return (
        <input 
          type="number" 
          step="any"
          className="composer-input" 
          placeholder={`Enter numeric ${col.Field}`}
          value={val}
          onChange={(e) => handleInputChange(col.Field, e.target.value, 'number')}
        />
      );
    }

    // Datetime/Timestamps
    if (type.includes('timestamp') || type.includes('datetime') || type.includes('date')) {
      return (
        <input 
          type="text" 
          className="composer-input" 
          placeholder="YYYY-MM-DD HH:MM:SS or current timestamp default"
          value={val}
          onChange={(e) => handleInputChange(col.Field, e.target.value, 'text')}
        />
      );
    }

    // Standard string input
    return (
      <input 
        type="text" 
        className="composer-input" 
        placeholder={`Enter text value...`}
        value={val}
        onChange={(e) => handleInputChange(col.Field, e.target.value, 'text')}
      />
    );
  };

  const filteredTables = tables.filter(t => t.name.toLowerCase().includes(tableSearch.toLowerCase()));
  const totalPages = Math.ceil(totalRows / limit);

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={24} color="var(--accent-gold)" />
            System Database Explorer
          </h1>
          <p className="admin-page-subtitle">Examine schemas, perform full CRUD operations on system tables, and run raw SQL queries</p>
        </div>
        <button type="button" className="admin-btn-view" onClick={fetchTables} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} /> Refresh Tables
        </button>
      </div>

      <div className="db-layout">
        {/* Left Table List Panel */}
        <div className="db-sidebar-panel">
          <div className="db-sidebar-search">
            <Search size={14} />
            <input 
              type="text" 
              placeholder="Search tables..." 
              value={tableSearch} 
              onChange={(e) => setTableSearch(e.target.value)} 
            />
          </div>
          <div className="db-table-list">
            {filteredTables.length === 0 ? (
              <div className="db-empty-tables">No matching tables</div>
            ) : (
              filteredTables.map(t => (
                <button
                  key={t.name}
                  type="button"
                  className={`db-table-item ${selectedTable === t.name ? 'active' : ''}`}
                  onClick={() => setSelectedTable(t.name)}
                >
                  <Database size={14} />
                  <span className="db-table-name-txt">{t.name}</span>
                  <span className="db-table-row-count">{t.count}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Workspace Panel */}
        <div className="db-main-workspace">
          {selectedTable ? (
            <div className="db-work-card">
              {/* Table Name Title */}
              <div className="db-work-header">
                <div>
                  <h2 className="db-work-title">{selectedTable}</h2>
                  <span className="db-work-subtitle">Selected Table explorer</span>
                </div>

                {/* Tabs */}
                <div className="db-tabs">
                  <button 
                    type="button" 
                    className={`db-tab ${activeTab === 'data' ? 'active' : ''}`}
                    onClick={() => setActiveTab('data')}
                  >
                    Data View
                  </button>
                  <button 
                    type="button" 
                    className={`db-tab ${activeTab === 'schema' ? 'active' : ''}`}
                    onClick={() => setActiveTab('schema')}
                  >
                    Schema
                  </button>
                  <button 
                    type="button" 
                    className={`db-tab ${activeTab === 'query' ? 'active' : ''}`}
                    onClick={() => setActiveTab('query')}
                  >
                    Custom SQL Console
                  </button>
                  <button 
                    type="button" 
                    className={`db-tab ${activeTab === 'actions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('actions')}
                  >
                    System Operations
                  </button>
                </div>
              </div>

              {/* Work Workspace Tabs rendering */}
              <div className="db-tab-content">
                {/* 1. DATA EXPLORER TAB */}
                {activeTab === 'data' && (
                  <div className="db-data-panel">
                    <div className="db-toolbar-row">
                      <form onSubmit={handleRowSearchSubmit} className="db-row-search-box">
                        <Search size={15} />
                        <input 
                          type="text" 
                          placeholder="Search row values..." 
                          value={rowSearch}
                          onChange={(e) => setRowSearch(e.target.value)}
                        />
                        <button type="submit" style={{ display: 'none' }}>Search</button>
                      </form>

                      <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                        {selectedRowIds.length > 0 && (
                          <button
                            type="button"
                            className="admin-btn-reject-sm"
                            style={{ 
                              margin: 0, 
                              padding: '0 16px', 
                              height: '38px', 
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                              fontWeight: 700,
                              animation: 'slideLeft 0.2s ease-out'
                            }}
                            onClick={handleBulkDelete}
                          >
                            <Trash2 size={15} /> Delete Selected ({selectedRowIds.length})
                          </button>
                        )}
                        <select 
                          className="db-limit-select"
                          value={limit} 
                          onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setPage(1);
                          }}
                        >
                          <option value="5">5 rows</option>
                          <option value="10">10 rows</option>
                          <option value="25">25 rows</option>
                          <option value="50">50 rows</option>
                        </select>
                        <button 
                          type="button" 
                          className="composer-submit-btn" 
                          style={{ margin: 0, padding: '0 16px', height: '38px', borderRadius: '8px' }}
                          onClick={openAddModal}
                        >
                          <Plus size={16} /> Add New Row
                        </button>
                      </div>

                    </div>

                    {/* Table Row Data Grid */}
                    <div className="db-table-responsive-container">
                      {isLoading ? (
                        <div className="admin-loading" style={{ padding: '40px 0' }}>
                          <div className="admin-loading-spinner"></div>
                          <p>Reading table rows...</p>
                        </div>
                      ) : rows.length === 0 ? (
                        <div className="db-rows-empty">
                          <Info size={24} />
                          <p>No rows found inside "{selectedTable}". Add records to inspect.</p>
                        </div>
                      ) : (
                        <table className="db-data-grid">
                          <thead>
                            <tr>
                              <th style={{ width: '40px', textAlign: 'center' }}>
                                <input 
                                  type="checkbox" 
                                  className="db-select-checkbox-all"
                                  checked={rows.length > 0 && rows.every(row => selectedRowIds.includes(getRowPrimaryKey(row)))}
                                  onChange={handleToggleSelectAll}
                                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)', cursor: 'pointer', verticalAlign: 'middle' }}
                                />
                              </th>
                              {schema.map(col => (
                                <th 
                                  key={col.Field} 
                                  onClick={() => handleSort(col.Field)}
                                  className="sortable-th"
                                  style={{ cursor: 'pointer', userSelect: 'none' }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {col.Field}
                                    {sortBy === col.Field && (
                                      <span style={{ fontSize: '10px', color: 'var(--accent-gold)' }}>
                                        {sortOrder === 'ASC' ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </div>
                                </th>
                              ))}

                              <th className="db-actions-column-header">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, idx) => {
                              // Find a suitable key
                              const pkValue = getRowPrimaryKey(row) || idx;
                              const isRowChecked = selectedRowIds.includes(pkValue);
                              return (
                                <tr key={pkValue} style={{ background: isRowChecked ? 'rgba(212, 175, 55, 0.04)' : '' }}>
                                  <td style={{ textAlign: 'center', width: '40px' }}>
                                    <input 
                                      type="checkbox" 
                                      className="db-select-checkbox-row"
                                      checked={isRowChecked}
                                      onChange={() => handleToggleRowSelect(pkValue)}
                                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)', cursor: 'pointer', verticalAlign: 'middle' }}
                                    />
                                  </td>
                                  {schema.map(col => {
                                    const val = row[col.Field];
                                    let displayVal = '';
                                    if (val === null) {
                                      displayVal = <em className="db-cell-null">NULL</em>;
                                    } else if (typeof val === 'object') {
                                      displayVal = JSON.stringify(val);
                                    } else if (col.Type.toLowerCase().includes('tinyint')) {
                                      displayVal = val === 1 || val === true || val === '1' ? (
                                        <span className="db-badge-boolean true"><Check size={10} /> True</span>
                                      ) : (
                                        <span className="db-badge-boolean false"><X size={10} /> False</span>
                                      );
                                    } else {
                                      displayVal = String(val);
                                    }

                                    return (
                                      <td key={col.Field} className="db-monospace-cell" title={typeof val === 'string' ? val : ''}>
                                        {displayVal}
                                      </td>
                                    );
                                  })}
                                  <td className="db-actions-column-cell">
                                    <div className="admin-action-btns" style={{ justifyContent: 'center' }}>
                                      <button 
                                        type="button" 
                                        className="admin-btn-view"
                                        style={{ padding: '5px 8px' }}
                                        title="Edit Row"
                                        onClick={() => openEditModal(row)}
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button 
                                        type="button" 
                                        className="admin-btn-reject-sm"
                                        style={{ padding: '5px 8px' }}
                                        title="Delete Row"
                                        onClick={() => handleDeleteRow(pkValue)}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Pagination footer */}
                    {!isLoading && rows.length > 0 && (
                      <div className="db-pagination-footer">
                        <span className="db-paginator-info">
                          Showing <strong>{rows.length}</strong> of <strong>{totalRows}</strong> records
                        </span>
                        <div className="db-paginator-buttons">
                          <button 
                            type="button" 
                            className="db-paginator-btn" 
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                          >
                            <ChevronLeft size={16} /> Prev
                          </button>
                          <span className="db-page-counter">Page {page} of {totalPages || 1}</span>
                          <button 
                            type="button" 
                            className="db-paginator-btn" 
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          >
                            Next <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. SCHEMA TAB */}
                {activeTab === 'schema' && (
                  <div className="db-schema-panel">
                    <table className="db-schema-table">
                      <thead>
                        <tr>
                          <th>Column Field</th>
                          <th>Data Type</th>
                          <th>Nullable</th>
                          <th>Index Key</th>
                          <th>Default Value</th>
                          <th>Extra Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schema.map(col => (
                          <tr key={col.Field}>
                            <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{col.Field}</td>
                            <td className="db-monospace-cell" style={{ color: 'var(--accent-gold)' }}>{col.Type}</td>
                            <td>
                              <span className={`schema-indicator ${col.Null === 'YES' ? 'yes' : 'no'}`}>
                                {col.Null}
                              </span>
                            </td>
                            <td>
                              {col.Key ? (
                                <span className={`schema-key-badge ${col.Key.toLowerCase()}`}>
                                  {col.Key}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="db-monospace-cell">
                              {col.Default === null ? <em style={{ opacity: 0.5 }}>NULL</em> : String(col.Default)}
                            </td>
                            <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{col.Extra || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3. CUSTOM QUERY TAB */}
                {activeTab === 'query' && (
                  <div className="db-query-panel">
                    <form onSubmit={handleExecuteQuery} className="db-query-form">
                      <div className="db-query-editor-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Code size={16} color="var(--accent-gold)" />
                          <span style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            SQL Editor Console
                          </span>
                        </div>
                        <span className="db-editor-hint">Supports select, update, insert, and join operations.</span>
                      </div>
                      <textarea
                        className="db-query-textarea"
                        value={sqlQuery}
                        onChange={(e) => setSqlQuery(e.target.value)}
                        placeholder="Write raw SQL query here..."
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                        <button 
                          type="submit" 
                          className="composer-submit-btn" 
                          style={{ margin: 0, padding: '0 20px', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}
                          disabled={isExecutingQuery}
                        >
                          <Play size={14} color="#000" fill="#000" /> 
                          {isExecutingQuery ? 'Executing Query...' : 'Execute SQL Query'}
                        </button>
                      </div>
                    </form>

                    {/* Query Error display */}
                    {queryError && (
                      <div className="db-query-error">
                        <AlertTriangle size={18} />
                        <div>
                          <strong>SQL Execution Failed:</strong>
                          <p>{queryError}</p>
                        </div>
                      </div>
                    )}

                    {/* Query Result Grid */}
                    {queryResult && (
                      <div className="db-query-results">
                        <h4 className="db-query-results-title">Query Results</h4>
                        {queryResult.length === 0 ? (
                          <div className="db-query-results-empty">
                            Query executed successfully. Returned 0 rows or affected 0 records.
                          </div>
                        ) : Array.isArray(queryResult) ? (
                          <div className="db-query-results-table-wrapper">
                            <table className="db-data-grid">
                              <thead>
                                <tr>
                                  {Object.keys(queryResult[0]).map(key => (
                                    <th key={key}>{key}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {queryResult.map((row, idx) => (
                                  <tr key={idx}>
                                    {Object.values(row).map((val, cIdx) => (
                                      <td key={cIdx} className="db-monospace-cell">
                                        {val === null ? <em className="db-cell-null">NULL</em> : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          // Result is an affectedRows status object
                          <pre className="db-query-status-pre">
                            {JSON.stringify(queryResult, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. ACTIONS / OPERATIONS TAB */}
                {activeTab === 'actions' && (
                  <div className="db-actions-panel">
                    <div className="db-operation-card danger-operation">
                      <div className="db-op-icon-col">
                        <AlertTriangle size={32} />
                      </div>
                      <div className="db-op-content-col">
                        <h3 className="db-op-title">Reset & Re-seed Entire System</h3>
                        <p className="db-op-desc">
                          Truncates all primary database tables (including bookings, transactions, document reviews, messages) and restores the system to clean seed data state. Useful for resetting test environments.
                        </p>
                        
                        {!showResetConfirm ? (
                          <button 
                            type="button" 
                            className="admin-modal-btn-reject"
                            onClick={() => setShowResetConfirm(true)}
                            style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', marginTop: '10px' }}
                          >
                            Initialize System Reset
                          </button>
                        ) : (
                          <div className="db-op-confirm-box" style={{ animation: 'slideUp 0.25s ease' }}>
                            <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600 }}>
                              Type <strong style={{ color: '#ff453a' }}>RESET</strong> to authorize complete truncate re-seed operations:
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <input 
                                type="text"
                                className="composer-input"
                                placeholder="Type RESET"
                                value={resetConfirmWord}
                                onChange={(e) => setResetConfirmWord(e.target.value)}
                                style={{ maxWidth: '160px', height: '38px', padding: '0 12px' }}
                              />
                              <button 
                                type="button" 
                                className="admin-modal-btn-reject"
                                disabled={resetConfirmWord !== 'RESET' || isResetting}
                                onClick={handleDatabaseReset}
                                style={{ padding: '0 16px', height: '38px', borderRadius: '8px' }}
                              >
                                {isResetting ? 'Running Seed...' : 'Truncate & Seed'}
                              </button>
                              <button 
                                type="button" 
                                className="admin-btn-view"
                                onClick={() => {
                                  setShowResetConfirm(false);
                                  setResetConfirmWord('');
                                }}
                                style={{ padding: '0 16px', height: '38px', borderRadius: '8px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="db-workspace-loading">
              <Database size={48} color="rgba(255,255,255,0.06)" />
              <p>Load tables in the sidebar to browse structural content records</p>
            </div>
          )}
        </div>
      </div>

      {/* Row Editor Modal */}
      {isModalOpen && (
        <>
          <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}></div>
          <div className="admin-modal admin-modal-lg db-row-editor-modal">
            <button type="button" className="admin-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            <h3 className="admin-modal-title">
              {modalMode === 'add' ? `Insert Row into ${selectedTable}` : `Edit Row ID ${activeRowId} in ${selectedTable}`}
            </h3>
            
            <form onSubmit={handleModalSubmit}>
              <div className="admin-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <div className="db-form-fields-grid">
                  {schema.map(col => {
                    const isPrimaryKey = col.Field === 'id' || col.Key === 'PRI';
                    return (
                      <div key={col.Field} className="form-group db-modal-form-group">
                        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
                          <label className="form-label" style={{ marginBottom: '4px' }}>
                            {col.Field}
                          </label>
                          <span className="db-field-type-badge">
                            {col.Type} {col.Null === 'NO' && <strong style={{ color: '#ff453a' }}>*</strong>}
                          </span>
                        </div>
                        {renderFieldInput(col)}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="admin-modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="admin-btn-view" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 18px' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="composer-submit-btn" 
                  style={{ margin: 0, padding: '8px 24px', height: 'auto', width: 'auto', borderRadius: '8px' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDatabaseManager;
