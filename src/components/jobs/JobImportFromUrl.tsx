import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Link, AlertCircle, CheckCircle } from 'lucide-react';

interface JobImportFromUrlProps {
  onDataImported: (data: any) => void;
}

export function JobImportFromUrl({ onDataImported }: JobImportFromUrlProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'partial' | 'failed'>('idle');
  const [message, setMessage] = useState('');

  const handleImport = async () => {
    if (!url) {
      setStatus('failed');
      setMessage('Please enter a URL');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('import-job-from-url', {
        body: { url },
      });

      if (error) throw error;

      // Validate response data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }

      if (data.success && data.data && typeof data.data === 'object') {
        try {
          // Safely check how many fields were successfully extracted
          const dataValues = Object.values(data.data);
          const extractedFields = dataValues.filter(v => v !== null && v !== '' && v !== undefined).length;
          const totalFields = Object.keys(data.data).length;

          if (extractedFields === totalFields) {
            setStatus('success');
            setMessage('Job details imported successfully!');
          } else if (extractedFields > 0) {
            setStatus('partial');
            setMessage(`Partial import: ${extractedFields}/${totalFields} fields extracted. Please review and complete.`);
          } else {
            setStatus('failed');
            setMessage(data.error || 'Could not extract job details from this website. Please enter manually.');
          }

          // Pass the data to parent with the original URL
          onDataImported({ ...data.data, job_url: url });
        } catch (processingError) {
          console.error('Error processing extracted data:', processingError);
          setStatus('failed');
          setMessage('Error processing job details. Please enter manually.');
        }
      } else {
        setStatus('failed');
        setMessage(data?.error || 'Failed to extract job details from this website. Some sites may block automated access.');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      setStatus('failed');
      setMessage('Failed to import job details. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        <Link className="h-5 w-5" />
        <h3 className="font-semibold">Import Job from URL</h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="import-url">Job Posting URL</Label>
        <div className="flex gap-2">
          <Input
            id="import-url"
            type="url"
            placeholder="https://www.linkedin.com/jobs/view/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          <Button onClick={handleImport} disabled={loading || !url}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import'
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground break-words whitespace-normal w-full mt-2 text-wrap sm:text-center p-2 leading-relaxed">
          Supports LinkedIn, Indeed, Glassdoor, and other job boards
        </p>
      </div>

      {status !== 'idle' && (
        <Alert variant={status === 'success' ? 'default' : status === 'failed' ? 'destructive' : 'default'}>
          {status === 'success' && <CheckCircle className="h-4 w-4" />}
          {status === 'failed' && <AlertCircle className="h-4 w-4" />}
          {status === 'partial' && <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
