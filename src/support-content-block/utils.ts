export function getRelativeDate( date: string ): string {
  // window.moment is exposed as a dependency of `wp.date`
  const moment: any = window[ 'moment' as any ];

  return moment( date ).fromNow();
}
