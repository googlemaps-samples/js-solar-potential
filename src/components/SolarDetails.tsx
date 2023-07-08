import { Accordion, AccordionDetails, AccordionSummary, Link, Typography } from "@mui/material"
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useState } from "react"
import { BuildingInsightsResponse, SolarPanelConfig } from "../services/solar/buildingInsights"
import LaunchIcon from '@mui/icons-material/Launch'
import Show from "./Show"

interface Props {
  building: BuildingInsightsResponse
  solarConfigIdx: number
  colors: string[]
}

export default function SolarDetails({ building, solarConfigIdx, colors }: Props) {
  const [expanded, setExpanded] = useState<string>('insights')

  const { solarPotential, ...buildingData } = building
  const {
    buildingStats,
    financialAnalyses, // unused
    roofSegmentStats,
    solarPanelConfigs,
    solarPanels,
    wholeRoofStats,
    ...solarPotentialData
  } = solarPotential

  const solarConfig = building.solarPotential.solarPanelConfigs[solarConfigIdx]
  const { roofSegmentSummaries, ...solarConfigData } = solarConfig

  const sections: Record<string, { url: string, data: any }> = {
    'insights': {
      url: 'https://developers.devsite.corp.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest#response-body',
      data: buildingData
    },
    'insights.solarPotential': {
      url: 'https://developers.devsite.corp.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest#solarpotential',
      data: solarPotentialData,
    },
    'insights.solarPotential.roofSegmentStats': {
      url: 'https://developers.devsite.corp.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest#roofsegmentsizeandsunshinestats',
      data: roofSegmentStats.map((roof, i) => {
        const { stats, ...roofData } = roof
        return {
          ...roofData,
          'stats.areaMeters': stats.areaMeters2,
          'stats.groundAreaMeters2': stats.groundAreaMeters2,
          'stats.sunshineQuantiles': JSON.stringify(stats.sunshineQuantiles.map(x => x.toFixed(1))).replace(/"/g, ''),
        }
      }),
    },
    [`insights.solarPotential.solarPanelConfigs[${solarConfigIdx}] (${solarPanelConfigs.length} configs total)`]: {
      url: 'https://developers.devsite.corp.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest#solarpanelconfig',
      data: {
        ...solarConfigData,
        roofSegmentSummaries: roofSegmentSummaries.map((roof, i) =>
        ({
          '': <Typography sx={{ color: colors[i % colors.length] }}>█</Typography>,
          ...roof
        })),
      },
    },
    [`insights.solarPotential.solarPanels[0:${solarConfig.panelsCount}] (${solarPanels.length} panels total)`]: {
      url: 'https://developers.devsite.corp.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest#solarpanel',
      data: solarPanels.slice(0, solarConfig.panelsCount),
    },
    'insights.solarPanels.wholeRoofStats': {
      url: 'https://developers.devsite.corp.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest#SizeAndSunshineStats',
      data: wholeRoofStats,
    },
  }

  return <>
    {Object.keys(sections).map(name =>
      <Accordion
        key={name}
        expanded={expanded == name}
        onChange={(_, isOpen) => setExpanded(isOpen ? name : '')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontFamily='monospace' fontSize={14}>{name}</Typography>
        </AccordionSummary >
        <AccordionDetails>
          <Show data={sections[name].data} />
          <Link href={sections[name].url} target='_blank' rel='noopener' >
            API Reference
            <LaunchIcon fontSize='small' />
          </Link><br />
        </AccordionDetails>
      </Accordion >
    )}
  </>
}