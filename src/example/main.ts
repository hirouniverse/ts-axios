import axios from './axios'
import { spawn } from 'child_process'

type StarWarsAPI = {
  count: number
  next?: string
  previous?: string
  results?: People[]
}

type People = {
  starship: string[]
  edited: string
  name: string
  created: string
  url: string
  gender: string
  vehicles: string[]
  skin_color: string
  hair_color: string
  height: string
  eye_color: string
  mass: string
  films: string[]
  species: string[]
  homeworld: string
  birth_year: string
}

const getPeople = (url: string): void => {
  axios.get<StarWarsAPI>(url).then(res => {
    const people: People[] | undefined = res.data.results
    if(people) {
      people.map(man => console.log(man.name))
    }

    if (res.data.next) {
      getPeople(res.data.next)
    }
  }).catch(err => {
    console.log(err)
  })
}

const main = (): void => {
  getPeople('/people')
}

main()
