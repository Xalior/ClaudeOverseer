import { useState, type ReactNode, Children, isValidElement } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface TaskNotificationData {
  taskId?: string
  status?: string
  summary?: string
  result?: string
  usage?: string
}

interface TaskNotificationCardProps {
  data: TaskNotificationData
}

/** Parse inner XML content from a task-notification block */
export function parseTaskNotificationXml(xml: string): TaskNotificationData {
  const extract = (tag: string): string | undefined => {
    const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)
    const m = re.exec(xml)
    return m?.[1]?.trim() || undefined
  }
  return {
    taskId: extract('task-id'),
    status: extract('status'),
    summary: extract('summary'),
    result: extract('result'),
    usage: extract('usage'),
  }
}

function statusBadgeClass(status?: string): string {
  switch (status) {
    case 'completed': return 'ui-badge--success'
    case 'error': return 'ui-badge--danger'
    case 'in_progress': return 'ui-badge--warning'
    default: return 'ui-badge--default'
  }
}

function statusAccentClass(status?: string): string {
  switch (status) {
    case 'completed': return 'task-notification--ok'
    case 'error': return 'task-notification--danger'
    case 'in_progress': return 'task-notification--warn'
    default: return ''
  }
}

export function TaskNotificationCard({ data }: TaskNotificationCardProps) {
  const isLong = (data.result?.length ?? 0) > 300
  const [expanded, setExpanded] = useState(!isLong)

  return (
    <div className={`task-notification ${statusAccentClass(data.status)}`}>
      {/* Header */}
      <div className="task-notification__header">
        <div className="task-notification__header-left">
          <span className={`ui-badge ${statusBadgeClass(data.status)}`}>
            {data.status || 'unknown'}
          </span>
          {data.taskId && (
            <span className="task-notification__task-id">{data.taskId}</span>
          )}
        </div>
        {data.summary && (
          <span className="task-notification__summary">{data.summary}</span>
        )}
      </div>

      {/* Result body */}
      {data.result && (
        <div className="task-notification__body">
          {isLong && (
            <button
              className="task-notification__toggle"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? '▾ Collapse' : '▸ Show result'}
            </button>
          )}
          {expanded && (
            <div className="task-notification__result message-card__body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  li: ({ children, ...props }) => (
                    <li {...props}>
                      {Children.map(children, (child: ReactNode) =>
                        typeof child === 'string' && !child.trim() ? null : child
                      )}
                    </li>
                  )
                }}
              >
                {data.result}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Usage footer */}
      {data.usage && (
        <div className="task-notification__footer">
          {data.usage}
        </div>
      )}
    </div>
  )
}
