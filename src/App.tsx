import { useState } from 'react'
import Map3D from './components/Map3D'
import { MdSearch } from 'react-icons/md'
import { Navbar, TextInput } from 'flowbite-react'

// TODO: DON'T HARDCODE THE API KEY!
// https://cloud.google.com/secret-manager/docs
// const GOOGLE_MAPS_API_KEY = process.env.GoogleMapsAPIKey // eslint-disable-line
const GOOGLE_MAPS_API_KEY = "TODO" // eslint-disable-line

export default function App() {
  // const [credits, setCredits] = useState('')

  const [lat, lon] = [37.422018698055396, -122.08419699019817]

  // let lat = 1.283
  // let lon = 103.8607

  return <>
    <Map3D
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      latitude={lat}
      longitude={lon}
    >

      {/* https://www.flowbite-react.com/docs/components/navbar */}
      <Navbar>
        <Navbar.Brand>
          <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
            ☀️ Solar potential
          </span>
        </Navbar.Brand>

        {/* https://www.flowbite-react.com/docs/components/forms */}
        <form className="flex max-w-md flex-col gap-4">
          <div>
            <TextInput
              id="search"
              icon={MdSearch}
              placeholder="Search address..."
              required
              shadow
            />
          </div>
        </form>
      </Navbar>

    </Map3D>
  </>
}

