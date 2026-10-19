import "dotenv/config";
import { db, pool } from "./src/db";
import { faker } from "@faker-js/faker/locale/it";
import { PromotionType } from "./src/utils/types/enum";
import { promotions, users, venues } from "./src/db/schema";

function generateData() {
  const user = {
    phoneCountryCode: "39",
    phoneNationalNumber: faker.phone.number({ style: "mobile" }),
    displayName: faker.internet.username(),
    isPlatformAdmin: false,
  };

  const venue_name: string = faker.company.name();

  const venue = {
    name: venue_name,
    slug: faker.helpers.slugify(venue_name).toLowerCase(),
    branding: {
      v: 1,
      logoUrl: "https://i.imgur.com/Ir0YAdf.png",
      bannerUrl: "https://i.imgur.com/A8YnOJx.jpeg",
      backgroundColor: "#5e1f3b",
    },
  };

  const promotion = {
    type: PromotionType.stamps,
    name: "Pizza ogni 10",
    config: { v: 1, stampsRequired: 10, reward: "Pizza omaggio" },
    startsAt: new Date(),
  };

  return { user, venue, promotion };
}

async function main() {
  const { user, venue, promotion } = generateData();
  console.log(user);
  console.log(venue);
  console.log(promotion);
  await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        phoneCountryCode: user.phoneCountryCode,
        phoneNationalNumber: user.phoneNationalNumber,
        displayName: user.displayName,
        isPlatformAdmin: user.isPlatformAdmin,
      })
      .returning({ id: users.id });

    const [newVenue] = await tx
      .insert(venues)
      .values({
        name: venue.name,
        slug: venue.slug,
        branding: venue.branding,
      })
      .returning({ id: venues.id });

    const [newPromotion] = await tx
      .insert(promotions)
      .values({
        venueId: newVenue.id,
        name: promotion.name,
        type: promotion.type,
        config: promotion.config,
        startsAt: promotion.startsAt,
      })
      .returning({ id: promotions.id });
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
