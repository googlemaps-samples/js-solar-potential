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

interface Props {
  data: any
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
}

export default function Show(props: Props) {
  const data = props.data ?? {}

  const withDefault = (f?: (x: any) => JSX.Element) =>
    f ? f(data) : <Typography>{data.toString()}</Typography>

  switch (typeof data) {
    case 'undefined': return withDefault(props.showUndefined)
    case 'boolean': return withDefault(props.showBool)
    case 'number': return withDefault(props.showNumber)
    case 'string': return withDefault(props.showString)
    case 'bigint': return withDefault(props.showBigInt)
    case 'function': return withDefault(props.showFunction)
    case 'symbol': return withDefault(props.showSymbol)

    case 'object':
      if (data === null) {
        return withDefault(props.showNull)
      }

      if (Array.isArray(data)) {
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

      return props.showRecord ? props.showRecord(data) :
        <TableContainer>
          <Table>
            <TableBody>
              {Object.keys(data).map((name, i) =>
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
