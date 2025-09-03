import React from 'react';
import { DocumentService, DocumentProcessingResult, SupportedFileTypes } from '../services';
import { ApiService } from '../types';
import {
  UploadIcon
} from '../icons';

interface FileUploadProps {
  onDocumentsProcessed: (results: DocumentProcessingResult[]) => void;
  onError: (error: string) => void;
  apiService?: ApiService;
  disabled?: boolean;
  className?: string;
}

interface FileUploadState {
  isProcessing: boolean;
  supportedTypes: SupportedFileTypes | null;
  documentService: DocumentService | null;
}

class FileUpload extends React.Component<FileUploadProps, FileUploadState> {
  private fileInputRef = React.createRef<HTMLInputElement>();

  constructor(props: FileUploadProps) {
    super(props);
    this.state = {
      isProcessing: false,
      supportedTypes: null,
      documentService: null
    };
  }

  componentDidMount() {
    this.initDocumentService();
  }

  // Initialize document service and get supported types
  initDocumentService = async () => {
    try {
      if (this.props.apiService) {
        const service = new DocumentService(this.props.apiService);
        this.setState({ documentService: service });
        
        const types = await service.getSupportedFileTypes();
        this.setState({ supportedTypes: types });
      }
    } catch (error) {
      console.error('Error initializing document service:', error);
    }
  };

  handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!this.state.documentService) {
      this.props.onError('Document service not available');
      return;
    }

    this.setState({ isProcessing: true });

    try {
      const fileArray = Array.from(files);
      const results: DocumentProcessingResult[] = [];

      // Process each file
      for (const file of fileArray) {
        try {
          // Validate file
          const validation = await this.state.documentService.validateFile(file);
          if (!validation.valid) {
            this.props.onError(`File ${file.name}: ${validation.error}`);
            continue;
          }

          // Process file
          const result = await this.state.documentService.processDocument(file);
          if (result.processing_success) {
            results.push(result);
          } else {
            this.props.onError(`Failed to process ${file.name}: ${result.error}`);
          }
        } catch (error) {
          this.props.onError(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (results.length > 0) {
        this.props.onDocumentsProcessed(results);
      }
    } catch (error) {
      this.props.onError(`Error processing documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.setState({ isProcessing: false });
      // Reset file input
      if (this.fileInputRef.current) {
        this.fileInputRef.current.value = '';
      }
    }
  };

  handleClick = () => {
    if (!this.props.disabled && this.fileInputRef.current) {
      this.fileInputRef.current.click();
    }
  };

  getAcceptedFileTypes = () => {
    if (!this.state.supportedTypes) return '';
    return Object.keys(this.state.supportedTypes.supported_types).join(',');
  };

  render() {
    const { disabled, className = '' } = this.props;
    const { isProcessing, supportedTypes } = this.state;

    return (
      <div className={`file-upload-container ${className}`}>
        <input
          ref={this.fileInputRef}
          type="file"
          multiple
          accept={this.getAcceptedFileTypes()}
          onChange={this.handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled || isProcessing}
        />
        
        <button
          onClick={this.handleClick}
          disabled={disabled || isProcessing}
          className="file-upload-button"
          title="Upload documents (PDF, TXT, CSV, JSON, Excel)"
        >
          {isProcessing ? (
            <div className="file-upload-loading">
              <div className="loading-spinner"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <>
              <UploadIcon />
              <span>Upload Documents</span>
            </>
          )}
        </button>

        {supportedTypes && (
          <div className="file-upload-info">
            <small>
              Supported: PDF, TXT, CSV, JSON, Excel • Max: {supportedTypes.max_file_size_mb}MB • Up to {supportedTypes.max_files_per_request} files
            </small>
          </div>
        )}
      </div>
    );
  }
}

export default FileUpload;
