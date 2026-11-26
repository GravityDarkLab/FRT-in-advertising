import type { Ad } from '../api'
import classes from './AdCard.module.css'
import { adDescription, adImage } from './ads'

/** One invented advertisement: the picture, with its slogan stuck on like a sale sticker. */
export function AdCard({ ad }: { ad: Ad }) {
  const picture = adImage(ad.id)
  return (
    <figure className={classes.card}>
      <span className={classes.tag}>Ad</span>
      {picture && <img src={picture} alt={adDescription(ad.id)} className={classes.picture} />}
      <figcaption className={classes.slogan}>{ad.label}</figcaption>
    </figure>
  )
}
