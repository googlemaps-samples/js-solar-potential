import { Box, Grid, Paper, Stack, Typography } from "@mui/material"

interface Props {
  colors: string[]
  min: number
  max: number
}

export default function Palette(props: Props) {
  const colors = props.colors.map(hex => '#' + hex).join(', ')
  const min = props.min.toFixed(1)
  const max = props.max.toFixed(1)
  const mid = ((props.min + props.max) / 2).toFixed(1)
  return <Paper sx={{ height: '100%' }}>
    <Stack direction='row' sx={{ height: '100%' }}>
      <Box p={1}>
        <Paper sx={{
          width: 32,
          height: '100%',
          background: `linear-gradient(to top, ${colors})`,
          outline: 'solid 1px',
        }} />
      </Box>
      <Grid
        pr={1}
        container
        direction='column'
        justifyContent='space-between'
        alignItems='flex-start'
      >
        <Grid item>
          <Typography variant='caption'>{max}</Typography>
        </Grid>
        <Grid item>
          <Typography variant='caption'>{mid}</Typography>
        </Grid>
        <Grid item>
          <Typography variant='caption'>{min}</Typography>
        </Grid>
      </Grid>
    </Stack>
  </Paper>
}