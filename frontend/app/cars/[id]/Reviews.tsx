import { reviews } from "@/lib/reviews";
import { Card, CardContent } from "@/components/ui/card";
import { RatingStars } from "./rating-stars";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const Reviews = () => {
  const average =
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return (
    <section aria-labelledby="reviews-heading" className="mt-12 sm:mt-16">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="reviews-heading" className="text-2xl font-bold">
            Reviews
          </h2>
          <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Demo data
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RatingStars rating={Math.round(average)} />
          <span className="font-semibold text-foreground">
            {average.toFixed(1)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{reviews.length} demo reviews</span>
        </div>
      </div>

      <ul className="flex flex-col gap-4">
        {reviews.map((review) => (
          <li key={review.id}>
            <Card>
              <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                  >
                    {initials(review.author)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{review.author}</p>
                      <time
                        className="text-xs text-muted-foreground"
                        dateTime={review.createdAt}
                      >
                        {formatDate(review.createdAt)}
                      </time>
                    </div>
                    <div className="mt-1">
                      <RatingStars rating={review.rating} />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {review.text}
                    </p>
                  </div>
                </div>

                {review.replies.length > 0 && (
                  <ul className="ml-8 flex flex-col gap-3 rounded-lg bg-muted p-4 sm:ml-12">
                    {review.replies.map((reply) => (
                      <li key={reply.id} className="flex items-start gap-3">
                        <div
                          aria-hidden="true"
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold"
                        >
                          {initials(reply.author)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">
                              {reply.author}
                            </p>
                            <time
                              className="text-xs text-muted-foreground"
                              dateTime={reply.createdAt}
                            >
                              {formatDate(reply.createdAt)}
                            </time>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {reply.text}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Reviews;
