import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Tag } from '../../tag';
import { Exam, Task } from '../../exam';

type Result =
  | { type: "task", name: string, link: Task }
  | { type: "exam", name: string, link: Exam }
  | { type: "tag", name: string, link: Tag }


@Component({
  selector: 'app-search',
  standalone: true,
  imports: [],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent {

  public search: string = "";
  public tags: Tag[] = [];
  public result: Result[] = [];

  constructor(
    private router: Router,
    private api: ApiService,
    private route: ActivatedRoute,
  ) { 
    this.route.params.subscribe(params => {
      this.result = [];
      this.search = "";
      this.tags = [];
      this.filter()
    })
      
  }


  private filter() {
    const lastURLPart = this.router.url.split("/").pop();
    if (lastURLPart === undefined || lastURLPart === "search") {
      console.warn("no search text detected");
      return;
    }
    this.search = lastURLPart


    this.api.getAllTags().subscribe(
      res => {
        this.tags = res.map(tag => Tag.fromPlain(tag));
        const filtered = this.tags.filter(tag => tag.getName().toLowerCase().includes(this.search.toLowerCase()))
        const result: Result[] = filtered.map(res => ({ name: res.getName(), type: "tag", link: res }))
        for (let res of result) {
          this.result.push(res);
        }
      },
      err => { console.error("Error fetching Tag list"), err }
    )
  }




}
