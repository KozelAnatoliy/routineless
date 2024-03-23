import TransportStream from 'winston-transport'

export class TestTransport extends TransportStream {
  private loggedStatements: LogEntry[] = []

  public reset(): void {
    this.loggedStatements = []
  }

  public getLoggedStatements(): LogEntry[] {
    return [...this.loggedStatements]
  }

  public override log(info: LogEntry, callback: () => void) {
    this.loggedStatements.push(info)
    callback()
  }
}

export interface LogEntry {
  level: string
  message: string
  [optionName: string]: any
}
