import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Info, Loader2, X } from 'lucide-react';
import { useImportMFP } from '../../hooks/useNutrition';
import toast from 'react-hot-toast';

interface MFPImportProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export function MFPImport({ onSuccess, onClose }: MFPImportProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportMFP();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
    } else {
      toast.error('Please drop a CSV file');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      const result = await importMutation.mutateAsync(selectedFile);
      toast.success(
        `Imported ${result.imported} entries across ${result.daysProcessed} days`
      );
      setSelectedFile(null);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Import failed');
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Import from MyFitnessPal</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
          >
            <Info className="w-4 h-4" />
            How to export
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {showInstructions && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm">
          <h4 className="font-medium mb-2">How to Export from MyFitnessPal:</h4>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>Log in to <strong>myfitnesspal.com</strong> (not the app)</li>
            <li>Go to <strong>Reports</strong> in the top menu</li>
            <li>Select your date range</li>
            <li>Click <strong>Export to Spreadsheet</strong></li>
            <li>Download the CSV file</li>
            <li>Upload it here</li>
          </ol>
          <p className="mt-2 text-gray-600">
            Note: CSV export is only available on the website, not the mobile app.
          </p>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${importMutation.isPending ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {importMutation.isPending ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
            <p className="text-gray-600">Importing data...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center">
            <FileText className="w-10 h-10 text-blue-500 mb-3" />
            <p className="text-gray-900 font-medium">{selectedFile.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : isDragging ? (
          <div className="flex flex-col items-center">
            <Upload className="w-10 h-10 text-blue-500 mb-3" />
            <p className="text-blue-600">Drop your CSV file here</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <FileText className="w-10 h-10 text-gray-400 mb-3" />
            <p className="text-gray-600 mb-1">
              Drag and drop your MFP export CSV here
            </p>
            <p className="text-sm text-gray-500">or click to select a file</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {selectedFile && !importMutation.isPending && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={clearFile}
            className="flex-1 btn btn-secondary"
          >
            Clear
          </button>
          <button
            onClick={handleImport}
            className="flex-1 btn btn-primary flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>
      )}

      {/* Success message */}
      {importMutation.isSuccess && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-800">Import successful!</p>
            <p className="text-sm text-green-700">
              Imported {importMutation.data?.imported || 0} entries
              across {importMutation.data?.daysProcessed || 0} days.
              {importMutation.data?.skipped ? ` (${importMutation.data.skipped} skipped)` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {importMutation.isError && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Import failed</p>
            <p className="text-sm text-red-700">
              {(importMutation.error as any)?.response?.data?.error?.message ||
                'Please check your file format and try again.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MFPImport;
