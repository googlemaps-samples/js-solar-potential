import { Fragment, PropsWithChildren } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Show from './Show';

interface Props {
  title?: string
  content?: any
}

export default function InfoCard(props: PropsWithChildren<Props>) {
  return (
    <Box sx={{ minWidth: 275, boxShadow: 10 }}>
      <Card variant="outlined">
        <Fragment>
          <CardContent>
            {props.title ?
              <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                {props.title}
              </Typography>
              : null
            }
            <Show data={props.content} />
          </CardContent>
          {props.children}
        </Fragment>
      </Card>
    </Box>
  );
}