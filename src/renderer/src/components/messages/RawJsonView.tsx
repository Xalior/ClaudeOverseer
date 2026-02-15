import { Card } from 'react-bootstrap'

interface RawJsonViewProps {
  data: unknown
}

export function RawJsonView({ data }: RawJsonViewProps) {
  return (
    <Card className="mb-3 border-secondary" data-testid="raw-json-view">
      <Card.Body className="p-2">
        <pre className="mb-0 small" style={{ maxHeight: '400px', overflow: 'auto' }}>
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      </Card.Body>
    </Card>
  )
}
