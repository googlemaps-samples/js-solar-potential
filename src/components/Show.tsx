import * as React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
// import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Date, isDate } from '../common';
import { TableHead } from '@mui/material';

interface Props {
  data?: any
  showBool?: ((x: boolean) => JSX.Element)
  showNumber?: ((x: number) => JSX.Element)
  showString?: ((x: string) => JSX.Element)
  showList?: ((x: any[]) => JSX.Element)
  showRecord?: ((x: Record<any, any>) => JSX.Element)
  showTable?: ((x: Record<any, any>[]) => JSX.Element)
  showDate?: ((x: Date) => JSX.Element)
  showUndefined?: ((x: undefined) => JSX.Element)
  showNull?: ((x: null) => JSX.Element)
  showBigInt?: ((x: BigInt) => JSX.Element)
  showSymbol?: ((x: Symbol) => JSX.Element)
  showFunction?: ((x: Function) => JSX.Element)
  sortObjectKeys?: boolean
  numberPrecision?: number
}

export default function Show(props: Props) {
  const data = props.data ?? {}
  const sortObjectKeys = props.sortObjectKeys ?? true
  const numberPrecision = props.numberPrecision ?? 7

  const withDefault = (f?: (x: any) => JSX.Element) =>
    f ? f(data) : <Typography>{data.toString()}</Typography>

  switch (typeof data) {
    case 'undefined': return withDefault(props.showUndefined)
    case 'boolean': return withDefault(props.showBool)
    case 'number': return props.showNumber
      ? props.showNumber(data)
      : <Typography>{Number.isInteger(data) ? data : data.toFixed(numberPrecision)}</Typography>
    case 'string': return withDefault(props.showString)
    case 'bigint': return withDefault(props.showBigInt)
    case 'function': return withDefault(props.showFunction)
    case 'symbol': return withDefault(props.showSymbol)

    case 'object':
      if (data === null) {
        return withDefault(props.showNull)
      }

      if (React.isValidElement(data)) {
        return data
      }

      if (Array.isArray(data)) {
        const headers = Object.keys(data[0])
        if (typeof data[0] === 'object') {
          return <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  {headers.map((field, i) =>
                    <TableCell key={i} align='center'>{field}</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, i) =>
                  <TableRow key={i} sx={{ '&:last-child td, &:last-child th': { border: 0 } }} >
                    {headers.map((field, j) =>
                      <TableCell key={j} align='center'>
                        <Show data={row[field]} />
                      </TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        }
        return props.showList ? props.showList(data) :
          <List>
            {data.map((x, i) =>
              <ListItem key={i}>
                <Show data={x} />
              </ListItem>
            )}
          </List >
      }

      if (isDate(data)) {
        return props.showDate ? props.showDate(data) :
          <Typography>{`${data.month}/${data.day}/${data.year}`}</Typography>
      }

      const keys = sortObjectKeys
        ? Object.keys(data).sort()
        : Object.keys(data)

      if (keys.length == 2 && 'latitude' in data && 'longitude' in data) {
        return <Typography>({data.latitude.toFixed(numberPrecision)}, {data.longitude.toFixed(numberPrecision)})</Typography>
      }

      return props.showRecord ? props.showRecord(data) :
        <TableContainer>
          <Table size='small'>
            <TableBody>
              {keys.map((name, i) =>
                <TableRow key={i}>
                  <TableCell>{name}</TableCell>
                  <TableCell>
                    <Show {...props} data={data[name]} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
  }
}
