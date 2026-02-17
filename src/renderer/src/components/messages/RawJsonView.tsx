import { Card, CardContent } from '../ui/card'

interface RawJsonViewProps {
  data: unknown
}

export function RawJsonView({ data }: RawJsonViewProps) {
  return (
    <Card className="message-card message-card--raw" data-testid="raw-json-view">
      <CardContent className="message-card__raw-content">
        <pre className="raw-json" style={{ maxHeight: '400px', overflow: 'auto' }}>
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      </CardContent>
    </Card>
  )
}
