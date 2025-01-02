import fs from 'fs'
import path from 'path'

const dirname = import.meta.dirname

const logsPath = path.join(dirname, '../logs')

export function writeLog({
  content,
  label,
  format = 'json',
}: {
  content: any
  label?: string
  format?: 'json' | 'html' | 'yaml'
}) {
  if (!fs.existsSync(logsPath)) fs.mkdirSync(logsPath, { recursive: true })

  const now = new Date(),
    date = now.getDate(),
    month = now.getMonth() + 1,
    year = now.getFullYear().toString().slice(2),
    hours = now.getHours(),
    minutes = now.getMinutes(),
    seconds = now.getSeconds()

  const timestamp = `${date}-${month}-${year}_${hours}:${minutes}:${seconds}`

  const formattedLabel = label ? `${timestamp}-${label}` : timestamp

  const newFilePath = path.join(logsPath, `${formattedLabel}.${format}`)

  let fileContent: string

  switch (format) {
    case 'json':
      fileContent = JSON.stringify(content, null, 2)
      break
    case 'html':
    case 'yaml':
      fileContent = content
      fileContent = content
      break
    default:
      throw new Error("Invalid format provided. Use 'json', 'html', or 'yaml'")
  }

  fs.writeFileSync(newFilePath, fileContent)
}
