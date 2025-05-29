import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { supabase } from '../supabaseClient'; // Assuming supabaseClient.ts is in src/
import { Candidate, Client, Job } from '../types/index'; // Import Client and Job

// Define the list of table names managed by this context
export type TableName = 'candidates' | 'clients' | 'jobs';

// Define the shape of the data for each table
interface TableData<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  lastFetched: Date | null; // To help decide if data is "stale"
}

// Define the overall shape of the context state
// It's a map where keys are table names and values are their corresponding TableData
interface DataContextState {
  candidates: TableData<Candidate>;
  clients: TableData<Client>;
  jobs: TableData<Job>;
  // Add other tables here by extending TableName and adding a property here
}

// Define the shape of the context value provided to consumers
interface DataContextValue {
  // The 'data' property will hold the state for all tables
  data: DataContextState;
  fetchTableData: <T>(tableName: TableName, selectQuery?: string) => Promise<void>;
  invalidateTableData: (tableName: TableName) => void;
  // getTableData might not be strictly necessary if 'data' is structured well
  // but can be kept for specific fetching logic or type safety if needed later.
  getTableData: <T>(tableName: TableName) => TableData<T>;
}

// Initial state for a single table
const initialTableData = <T,>(): TableData<T> => ({
  data: [],
  loading: false,
  error: null,
  lastFetched: null,
});

// Initial state for the entire context
const initialState: DataContextState = {
  candidates: initialTableData<Candidate>(),
  clients: initialTableData<Client>(),
  jobs: initialTableData<Job>(),
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [state, setState] = useState<DataContextState>(initialState);

  const fetchTableData = useCallback(async <T,>(
    tableName: TableName,
    selectQuery: string = '*' // Default select all columns
  ) => {
    setState(prevState => ({
      ...prevState,
      [tableName]: { ...prevState[tableName], loading: true, error: null },
    }));
    try {
      const { data, error } = await supabase
        .from(tableName) // Cast tableName to string for Supabase from()
        .select(selectQuery);

      if (error) throw error;

      setState(prevState => ({
        ...prevState,
        [tableName]: {
          data: data as T[],
          loading: false,
          error: null,
          lastFetched: new Date(),
        },
      }));
    } catch (err) {
      console.error(`Error fetching ${tableName}:`, err);
      setState(prevState => ({
        ...prevState,
        [tableName]: {
          ...prevState[tableName],
          loading: false,
          error: err instanceof Error ? err : new Error('An unknown error occurred'),
          data: [], // Clear data on error or keep stale data? For now, clearing.
        },
      }));
    }
  }, []);

  const invalidateTableData = useCallback((tableName: TableName) => {
    setState(prevState => ({
      ...prevState,
      [tableName]: {
        ...prevState[tableName],
        lastFetched: null, // Mark as stale, so it will be re-fetched
        // Optionally, clear data immediately: data: []
      },
    }));
    console.log(`[DataContext] Invalidated data for table: ${tableName}`);
  }, []);

  const getTableData = useCallback(<T,>(tableName: TableName): TableData<T> => {
    // This function now correctly uses TableName and returns the specific table's data.
    // The 'as unknown as TableData<T>' cast is because TypeScript can't guarantee
    // that state[tableName] matches T without more complex generic constraints on DataContextState itself.
    return state[tableName] as unknown as TableData<T>;
  }, [state]);

  // The contextValue now directly exposes the 'state' as 'data' for easier access
  const contextValue = useMemo(() => ({
    data: state, // Expose the whole state object under the 'data' key
    fetchTableData,
    invalidateTableData,
    getTableData,
  }), [state, fetchTableData, invalidateTableData, getTableData]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextValue => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Example usage (will be in page components):
// const { data, fetchTableData, invalidateTableData } = useData();
// const { candidates, clients } = data; // Access specific table data

// useEffect(() => {
//   if (!clients.data.length && !clients.loading && !clients.lastFetched) {
//     fetchTableData<Client>('clients', 'id, name');
//   }
// }, [clients, fetchTableData]);

// const handleAddSomething = async (newData) => {
//   // ... supabase insert logic for 'clients' or 'jobs' ...
//   // if (successful) {
//   //   invalidateTableData('clients'); // or 'jobs'
//   // }
// }; 